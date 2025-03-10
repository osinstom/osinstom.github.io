---
layout: post
title: Implementing tunneling techniques in P4 based on the example of VXLAN
date: 2019-08-07
tags: p4app tunneling SDN P4 VXLAN
categories: tutorial
toc:
  beginning: true
---

## Introduction

Recently, I started to implement the support for packet tunneling in our [P4C-to-uBPF](https://github.com/P4-Research/p4c/tree/master/backends/ubpf) compiler. However, in order to deeply understand P4 constructs describing tunneling I have created the reference implementation of the VXLAN tunneling for BMv2 switch.

This blog post describes how to design and implement more complex tunneling technique (like VXLAN) in the P4 language. The source code is available on [Github](https://github.com/P4-Research/p4-demos/tree/master/vxlan).

## Short introduction to VXLAN

The VXLAN (Virtual eXtensible Local Area Network) protocol has been standardized in [RFC 7348](https://tools.ietf.org/html/rfc7348) and is usually used to provide overlay communications between virtual machines in the multi-tenant virtualized data center. It isolates logically networks by using Virtual Network Identifier (VNI). The VNI uniquely identifies a Network Segment or, interchangeably, VXLAN Overlay Network. For more information on how VXLAN works visit these references:

[https://sites.google.com/site/amitsciscozone/home/data-center/vxlan](https://sites.google.com/site/amitsciscozone/home/data-center/vxlan)

[https://medium.com/@NTTICT/vxlan-explained-930cc825a51](https://medium.com/@NTTICT/vxlan-explained-930cc825a51)

[RFC 7348](https://tools.ietf.org/html/rfc7348)

## Design and implementation of VXLAN in P4

In this section I describe more interesting parts of the P4 program. The P4 source code is divided into [header.p4](https://github.com/P4-Research/p4-demos/blob/master/vxlan/vxlan.p4app/header.p4), [parser.p4](https://github.com/P4-Research/p4-demos/blob/master/vxlan/vxlan.p4app/parser.p4) and [vxlan.p4](https://github.com/P4-Research/p4-demos/blob/master/vxlan/vxlan.p4app/vxlan.p4).

### Headers

This P4 program will use four types of headers: Ethernet, IP, UDP and VXLAN. The VXLAN header is defined as follows:

```
header vxlan_t {
    bit<8>  flags;
    bit<24> reserved;
    bit<24> vni;
    bit<8>  reserved_2;
}
```

In fact, in this example only VNI will be used, the rest of fields will be set to zero.

### Parser

When implementing VXLAN tunneling we need to have more complex parsing logic in order to parse properly packets that arrive encapsulated into VXLAN header. For such packets the parser need to handle outer Ethernet, IP, UDP and VXLAN headers and the inner Ethernet and IP headers. Therefore, the implementation looks as follows:

```
#define UDP_PORT_VXLAN 4789
#define UDP_PROTO 17
#define IPV4_ETHTYPE 0x800

parser ParserImpl(packet_in packet, out headers hdr, inout metadata meta, inout standard_metadata_t standard_metadata) {
    state start {
        transition parse_ethernet;
    }
    state parse_ethernet {
        packet.extract(hdr.ethernet);
        transition select(hdr.ethernet.etherType) {
            IPV4_ETHTYPE: parse_ipv4;
            default: accept;
        }
    }
    state parse_ipv4 {
        packet.extract(hdr.ipv4);
        transition select(hdr.ipv4.protocol) {
            UDP_PROTO: parse_udp;
            default: accept;
        }
    }
    state parse_udp {
        packet.extract(hdr.udp);
        transition select(hdr.udp.dstPort) {
            UDP_PORT_VXLAN: parse_vxlan;
            default: accept;
         }
    }
    state parse_vxlan {
        packet.extract(hdr.vxlan);
        transition parse_inner_ethernet;
    }
    state parse_inner_ethernet {
        packet.extract(hdr.inner_ethernet);
        transition select(hdr.ethernet.etherType) {
            IPV4_ETHTYPE: parse_inner_ipv4;
            default: accept;
        }
    }
    state parse_inner_ipv4 {
        packet.extract(hdr.inner_ipv4);
        transition accept;
    }
}

control DeparserImpl(packet_out packet, in headers hdr) {
    apply {
        packet.emit(hdr.ethernet);
        packet.emit(hdr.ipv4);
        packet.emit(hdr.udp);
        packet.emit(hdr.vxlan);
        packet.emit(hdr.inner_ethernet);
        packet.emit(hdr.inner_ipv4);
    }
}

control verifyChecksum(inout headers hdr, inout metadata meta) {
    apply { }
}

control computeChecksum(inout headers hdr, inout metadata meta) {
    apply {

    }
}

```

The parser distinguish if the packet is encapsulated in VXLAN based on the UDP destination port, which should be set to 4789, which is the standard port for VXLAN encapsulation. Then if the packet is encapsulated parser goes through following stages: parse_vxlan() -> parse_inner_ethernet() -> parse_inner_ipv4().

In the same file I have implemented deparser, which defines the order, in which headers are written to packets at the egress.

### Control blocks

It is a good practice to design P4 programs (especially those that perform tunneling) by dividing the P4 program into four functional blocks:

- **_Upstream ingress_** - ingress control block for incoming _**encapsulated**_ packets.
- _**Upstream egress**_ - egress control block for outgoing packets, that arrived as encapsulated.
- _**Downstream ingress**_ - control block for incoming raw (not encapsulated) packets.
- **_Downstream egress_** - control block for outgoing packets, that arrived as not encapsulated.

Upstream and downstreams terms refer to the direction of the traffic. The upstream traffic is the traffic that is encapsulated (traffic being sent between VXLAN endpoints) and should be decapsulated at the ingress. On the contrary, the downstream traffic is the traffic, which is not encapsulated yet (traffic from host to switch). It simplify thinking of the P4 program design.

#### Upstream ingress

The upstream ingress needs to validate the VXLAN header and strip it out. Moreover, it must perform L2 forwarding to send the decapsulated packet.

```
control vxlan_ingress_upstream(inout headers hdr, inout metadata meta, inout standard_metadata_t standard_metadata) {

    action vxlan_decap() {
        // as simple as set outer headers as invalid
        hdr.ethernet.setInvalid();
        hdr.ipv4.setInvalid();
        hdr.udp.setInvalid();
        hdr.vxlan.setInvalid();
    }

    table t_vxlan_term {
        key = {
            // Inner Ethernet desintation MAC address of target VM
            hdr.inner_ethernet.dstAddr : exact;
        }

        actions = {
            @defaultonly NoAction;
            vxlan_decap();
        }

    }

    action forward(bit<9> port) {
        standard_metadata.egress_spec = port;
    }

    table t_forward_l2 {
        key = {
            hdr.inner_ethernet.dstAddr : exact;
        }

        actions = {
            forward;
        }
    }

    apply {
        if (hdr.ipv4.isValid()) {
            if (t_vxlan_term.apply().hit) {
                t_forward_l2.apply();
            }
        }
    }
}
```

It is implemented in the vxlan_ingress_upstream control block using two tables: t_vxlan_term and t_forward_l2. The former decapsulates packets that matches the key. The destination MAC address of the inner Ethernet header should point to the host that is directly connected to VXLAN endpoint (the switch) via Layer 2 network. Encapsulation action sets outer headers as invalid, so that the deparser knows not to put these headers in the output packet. If the t_vxlan_term is hit, the t_forward_l2 is responsible for forwarding packet based on the destination MAC address of the inner Ethernet header.

#### Upstream egress

In the context of VXLAN processing the upstream egress block does not need to do anything.

#### Downstream ingress

The downstream ingress is responsible for determining the value of the VNI identifier that will be used to encapsulate L2 packet by the downstream egress. Moreover, it determines source IP address and next hop IP address for the encapsulated packets. It also performs routing for encapsulates packets.

```
control vxlan_ingress_downstream(inout headers hdr, inout metadata meta, inout standard_metadata_t standard_metadata) {

    action set_vni(bit<24> vni) {
        meta.vxlan_vni = vni;
    }

    action set_ipv4_nexthop(bit<32> nexthop) {
        meta.nexthop = nexthop;
    }

    table t_vxlan_segment {

        key = {
            hdr.ipv4.dstAddr : lpm;
        }

        actions = {
            @defaultonly NoAction;
            set_vni;
        }

    }

    table t_vxlan_nexthop {

        key = {
            hdr.ethernet.dstAddr : exact;
        }

        actions = {
            set_ipv4_nexthop;
        }
    }

    action set_vtep_ip(bit<32> vtep_ip) {
        meta.vtepIP = vtep_ip;
    }

    table t_vtep {
        key = {
            hdr.ethernet.srcAddr : exact;
        }

        actions = {
            set_vtep_ip;
        }

    }

    action route(bit<9> port) {
        standard_metadata.egress_spec = port;
    }

    table t_vxlan_routing {

        key = {
            meta.nexthop : exact;
        }

        actions = {
            route;
        }
    }

    apply {
        if (hdr.ipv4.isValid()) {
            t_vtep.apply();
            if(t_vxlan_segment.apply().hit) {
                if(t_vxlan_nexthop.apply().hit) {
                    t_vxlan_routing.apply();
                }
            }
        }
    }

}
```

The apply method firsty invokes t_vtep table, which determines source IP address for encapsulated packets based on source MAC address. The source MAC address is the address of the host that is directly connected to the VXLAN endpoint (switch). Then, the control block determines VXLAN Segment ID (the value of VNI) based on the IP subnet mask. Each IP subnet gets unique VNI. If the VXLAN Segment ID is found the next hop IP address is determined. It would be the IP address of the peer VXLAN endpoint. Finally, the P4 enforce to determine output port for packet at the ingress pipeline. Thus, t_vxlan_routing table determines output port based on the next hop IP address. At this moment, everything is prepared to encapsulate packet and send it out in the downstream egress block.

#### Downstream egress

If the VNI has been determined in the ingress downstream block the downstream egress block just encapsulates the packet and sends the L2 frame.

```
control vxlan_egress_downstream(inout headers hdr, inout metadata meta, inout standard_metadata_t standard_metadata) {

    action rewrite_macs(bit<48> smac, bit<48> dmac) {
        hdr.ethernet.srcAddr = smac;
        hdr.ethernet.dstAddr = dmac;
    }

    table t_send_frame {

            key = {
                hdr.ipv4.dstAddr : exact;
            }

            actions = {
                rewrite_macs;
            }
        }

    action vxlan_encap() {

        hdr.inner_ethernet = hdr.ethernet;
        hdr.inner_ipv4 = hdr.ipv4;

        hdr.ethernet.setValid();

        hdr.ipv4.setValid();
        hdr.ipv4.version = IP_VERSION_4;
        hdr.ipv4.ihl = IPV4_MIN_IHL;
        hdr.ipv4.diffserv = 0;
        hdr.ipv4.totalLen = hdr.ipv4.totalLen
                            + (ETH_HDR_SIZE + IPV4_HDR_SIZE + UDP_HDR_SIZE + VXLAN_HDR_SIZE);
        hdr.ipv4.identification = 0x1513; /* From NGIC */
        hdr.ipv4.flags = 0;
        hdr.ipv4.fragOffset = 0;
        hdr.ipv4.ttl = 64;
        hdr.ipv4.protocol = UDP_PROTO;
        hdr.ipv4.dstAddr = meta.nexthop;
        hdr.ipv4.srcAddr = meta.vtepIP;
        hdr.ipv4.hdrChecksum = 0;

        hdr.udp.setValid();
        // The VTEP calculates the source port by performing the hash of the inner Ethernet frame's header.
        hash(hdr.udp.srcPort, HashAlgorithm.crc16, (bit<13>)0, { hdr.inner_ethernet }, (bit<32>)65536);
        hdr.udp.dstPort = UDP_PORT_VXLAN;
        hdr.udp.length = hdr.ipv4.totalLen + (UDP_HDR_SIZE + VXLAN_HDR_SIZE);
        hdr.udp.checksum = 0;

        hdr.vxlan.setValid();
        hdr.vxlan.reserved = 0;
        hdr.vxlan.reserved_2 = 0;
        hdr.vxlan.flags = 0;
        hdr.vxlan.vni = meta.vxlan_vni;

    }

    apply {
        if (meta.vxlan_vni != 0) {
            vxlan_encap();
            if (hdr.vxlan.isValid()) {
                t_send_frame.apply();
            }
        }
    }

}
```

However, the vxlan_encap() action is quite complex. Firsty, it copies the contenct of Ethernet and IP headers to the inner Ethernet and IP headers so it will act as a packet payload now. Then, outer headers (Ethernet, IP, UDP and VXLAN) are set valid and their header's fields are filled. For the outer IP header the destination IP address is taken from nexthop value, which is stored in metadata. Similarily, the source IP address is set to the IP address of the VXLAN endpoint. Furthermore, the UDP header is pushed. Note that the source UDP port is caluclated as a hash value of Ethernet header (according to specification).

Once the packet is encapsulated the MAC addresses of outer Ethernet header are set accordingly to the configuration of the switch interfaces.

## Running example

In order to run example I have used [p4app](https://github.com/p4lang/p4app/), which is really nice and simple tool (based on Docker and Mininet) to test P4 programs. I have heard about p4app during the last [IEEE NetSoft conference](https://netsoft2019.ieee-netsoft.org/), good to be there!

We will use simple Mininet topology with two switches and two hosts. The test environment is described in [the p4app manifest file](https://github.com/P4-Research/p4-demos/blob/master/vxlan/vxlan.p4app/p4app.json). I had to write simple controller module to avoid setting up L3 configuration for hosts. I have also configured Mininet with staticArp(), so that I didn't have to implement [ARP handling mechanism for VXLAN endpoints](https://blogs.vmware.com/vsphere/2013/05/vxlan-series-how-vtep-learns-and-creates-forwarding-table-part-5.html). It requires more complex P4 logic and for the sake of simplicity I have omitted this part of VTEP's functionality in the P4 program.

Run the demo:

`sudo p4app run vxlan.p4app`

It will start Mininet, install the VXLAN P4 program on the switches and configure flow rules for them.

You can test VXLAN encapsulation by sending some traffic (e.g. ping). By running _tcpdump_ on the switch interfaces gives you insight on how packets are handled:

s1-eth1
```bash
11:14:54.689967 00:04:00:00:01:01 (oui Unknown) > 00:04:00:00:02:01 (oui Unknown), ethertype IPv4 (0x0800), length 98: 10.0.0.1 > 10.0.0.2: ICMP echo request, id 113, seq 23, length 64

11:14:54.692320 00:04:00:00:02:01 (oui Unknown) > 00:04:00:00:01:01 (oui Unknown), ethertype IPv4 (0x0800), length 98: 10.0.0.2 > 10.0.0.1: ICMP echo reply, id 113, seq 23, length 64
```

s1-eth2
```bash
11:15:14.719712 00:aa:00:01:00:02 (oui Unknown) > 00:aa:00:02:00:03 (oui Unknown), ethertype IPv4 (0x0800), length 148: 192.168.11.1.58032 > 192.168.11.254.4789: VXLAN, flags [.] (0x00), vni 22
00:04:00:00:01:01 (oui Unknown) > 00:04:00:00:02:01 (oui Unknown), ethertype IPv4 (0x0800), length 98: 10.0.0.1 > 10.0.0.2: ICMP echo request, id 113, seq 43, length 64

11:15:14.720664 00:aa:00:02:00:03 (oui Unknown) > 00:aa:00:01:00:02 (oui Unknown), ethertype IPv4 (0x0800), length 148: 192.168.11.254.43328 > 192.168.11.1.4789: VXLAN, flags [.] (0x00), vni 22
00:04:00:00:02:01 (oui Unknown) > 00:04:00:00:01:01 (oui Unknown), ethertype IPv4 (0x0800), length 98: 10.0.0.2 > 10.0.0.1: ICMP echo reply, id 113, seq 43, length 64
```

s2-eth2
```
11:15:14.719712 00:aa:00:01:00:02 (oui Unknown) > 00:aa:00:02:00:03 (oui Unknown), ethertype IPv4 (0x0800), length 148: 192.168.11.1.58032 > 192.168.11.254.4789: VXLAN, flags [.] (0x00), vni 22
00:04:00:00:01:01 (oui Unknown) > 00:04:00:00:02:01 (oui Unknown), ethertype IPv4 (0x0800), length 98: 10.0.0.1 > 10.0.0.2: ICMP echo request, id 113, seq 82, length 64

11:15:14.720664 00:aa:00:02:00:03 (oui Unknown) > 00:aa:00:01:00:02 (oui Unknown), ethertype IPv4 (0x0800), length 148: 192.168.11.254.43328 > 192.168.11.1.4789: VXLAN, flags [.] (0x00), vni 22
00:04:00:00:02:01 (oui Unknown) > 00:04:00:00:01:01 (oui Unknown), ethertype IPv4 (0x0800), length 98: 10.0.0.2 > 10.0.0.1: ICMP echo reply, id 113, seq 82, length 64
```

s2-eth1
```
11:15:14.719712 00:04:00:00:01:01 (oui Unknown) > 00:04:00:00:02:01 (oui Unknown), ethertype IPv4 (0x0800), length 98: 10.0.0.1 > 10.0.0.2: ICMP echo request, id 113, seq 133, length 64

11:15:14.720664 00:04:00:00:02:01 (oui Unknown) > 00:04:00:00:01:01 (oui Unknown), ethertype IPv4 (0x0800), length 98: 10.0.0.2 > 10.0.0.1: ICMP echo reply, id 113, seq 133, length 64
```

## Summary

The P4 implementation of the more advanced tunneling techniques (like VXLAN) requires a bit more effort than more standard networking. The purpose of this tutorial was to show how to implement them properly in the P4 language. I really recommend to split control block into four parts implementing upstream ingress and egress and downstream ingress and egress, seperately. It is _the good practice_ that should ease the programming of the complex P4 programs. Following the VXLAN example one can implement similar tunneling techniques such as GPRS Tunneling Protocol (GTP) or Network Virtualization using Generic Routing Encapsulation (NVGRE).