---
date: '2019-08-07 14:33 +0200'
layout: single
published: false
title: Implementing tunneling techniques in P4 based on the example of VXLAN
---
## Introduction

Recently, I have been implementing the support for packet tunneling in our [P4C-to-uBPF](https://github.com/P4-Research/p4c/tree/master/backends/ubpf) compiler. However, in order to deeply understand P4 constructs describing tunneling I have created the reference implementation of the VXLAN tunneling for BMv2 switch. 

This blog post describes how to design and implement more complex tunneling technique (like VXLAN) in the P4 language.

## Short introduction to VXLAN

The VXLAN (Virtual eXtensible Local Area Network) protocol has been standardized in [RFC 7348](https://tools.ietf.org/html/rfc7348) and is usually used to provide overlay communications between virtual machines in the multi-tenant virtualized data center. 

The VNI uniquely identifies a Network Segment or, interchangeably, VXLAN Overlay Network. 

## Design and implementation of VXLAN in P4

### Headers

### Parser

### Control blocks

It is a good practice to design P4 programs (especially those that perform tunneling) by dividing the P4 program into four functional blocks:

- **_Upstream ingress_** - ingress control block for incoming packets. 
- Upstream egress - egress control block for incoming packets.
- Downstream ingress - control block for incoming, downstream packets.
- Downstream egress - control block for outgoing, downstream packets.

Upstream and downstreams terms refer to the direction of the traffic. We can distinguish direction of traffic by imaginating the client and server between switch. The downstream traffic is the traffic from server to client and upstream from client to server. It simplify thinking of the P4 program design.   

#### Upstream ingress

The upstream ingress needs to validate the VXLAN header and strip it out. 

#### Upstream egress 

In the context of VXLAN processing the upstream egress block does not need to do anything. However, the upstream egress should forward the L2 packets that has been decapsulated by the upstream ingress. 

#### Downstream ingress 

The downstream ingress is responsible for determining the value of the VNI identifier that will be used to encapsulate L2 packet by the downstream egress. 




## Summary
