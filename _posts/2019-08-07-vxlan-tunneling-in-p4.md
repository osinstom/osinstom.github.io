---
date: '2019-08-07 14:33 +0200'
layout: single
published: false
title: Implementing tunneling techniques in P4 based on the example of VXLAN
---
## Introduction

Recently, I have been implementing the support for packet tunneling in our [P4C-to-uBPF](https://github.com/P4-Research/p4c/tree/master/backends/ubpf) compiler. However, in order to deeply understand P4 constructs describing tunneling I have created the reference implementation of the VXLAN tunneling for BMv2 switch. 

This blog post describes how to design and implement more complex tunneling technique (like VXLAN) in the P4 language. The source code is available on [Github](https://github.com/P4-Research/p4-demos/tree/master/vxlan).

## Short introduction to VXLAN

The VXLAN (Virtual eXtensible Local Area Network) protocol has been standardized in [RFC 7348](https://tools.ietf.org/html/rfc7348) and is usually used to provide overlay communications between virtual machines in the multi-tenant virtualized data center. 

The VNI uniquely identifies a Network Segment or, interchangeably, VXLAN Overlay Network. 

## Design and implementation of VXLAN in P4

In this section I describe more interesting parts of the P4 program. The P4 source code is divided into [header.p4](https://github.com/P4-Research/p4-demos/blob/master/vxlan/vxlan.p4app/header.p4), [parser.p4](https://github.com/P4-Research/p4-demos/blob/master/vxlan/vxlan.p4app/parser.p4) and [vxlan.p4](https://github.com/P4-Research/p4-demos/blob/master/vxlan/vxlan.p4app/vxlan.p4).

### Headers



### Parser

### Control blocks

It is a good practice to design P4 programs (especially those that perform tunneling) by dividing the P4 program into four functional blocks:

- **_Upstream ingress_** - ingress control block for incoming not encapsulated packets. 
- _**Upstream egress**_ - egress control block for outgoing  packets.
- _**Downstream ingress**_ - control block for incoming, downstream packets.
- **_Downstream egress_** - control block for outgoing, downstream packets.

Upstream and downstreams terms refer to the direction of the traffic. The upstream traffic is the traffic that is not encapsulated yet (packets from hosts to switch) and should be encapsulated. The downstream traffic is the traffic, which has been already encapsulated and it is the traffic being sent between VXLAN endpoints. It simplify thinking of the P4 program design.   

#### Upstream ingress

The upstream ingress needs to validate the VXLAN header and strip it out. Moreover, it must perform L2 forwarding to send the decapsulated packet 

#### Upstream egress 

In the context of VXLAN processing the upstream egress block does not need to do anything. 

#### Downstream ingress 

The downstream ingress is responsible for determining the value of the VNI identifier that will be used to encapsulate L2 packet by the downstream egress. 

## Running example

In order to run example I have used [p4app](https://github.com/p4lang/p4app/), which is really nice and simple tool (based on Docker and Mininet) to test P4 programs. I have heard about p4app during the last [IEEE NetSoft conference](https://netsoft2019.ieee-netsoft.org/), good to be there! 

We will use simple Mininet topology with two switches and two hosts. The test environment is described in [the p4app manifest file](https://github.com/P4-Research/p4-demos/blob/master/vxlan/vxlan.p4app/p4app.json). I had to write simple controller module to avoid setting up L3 configuration for hosts. I have also configured Mininet with staticArp(), so that I didn't have to implement [ARP handling mechanism for VXLAN endpoints](https://blogs.vmware.com/vsphere/2013/05/vxlan-series-how-vtep-learns-and-creates-forwarding-table-part-5.html). It requires more complex P4 logic and for the sake of simplicity I have omitted this part of VTEP's functionality in the P4 program.

Run the demo:

`sudo p4app run vxlan.p4app`

It will start Mininet, install the VXLAN P4 program on the switches and configure flow rules for them. You can test VXLAN encapsulation by sending some traffic (e.g. ping). By running _tcpdump_ on the switch interfaces gives you insight on how packets are handled:

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
