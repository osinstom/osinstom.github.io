---
date: '2020-02-06 13:35 +0100'
layout: single
published: false
title: p4c-ubpf - the new back-end for the P4 compiler!
categories: ''
tags: ''
---

With the constant development of the P4 language more and more programmable targets are emerging. The P4 compiler has already support for the next-generation Linux datapath such as eBPF/XDP. However, in-kernel eBPF has its own limitations. Sometimes, it is required to introduce runtime extensibility mechanism in a user-space packet processing applications. The user-space BPF (uBPF) is a re-implementation of in-kernel eBPF virtual machine and provides user-space execution environment, which can be extended at runtime.  

This blog post introduces p4c-ubpf - the new back-end for the P4 compiler - that enables programming packet processing modules for uBPF. The p4c-ubpf allows to execute the P4 code in any solution implementing the kernel bypass (e.g. DPDK or AF_XDP applications). 

# uBPF for packet processing

## Why uBPF?

The uBPF project re-implements the eBPF kernel-based Virtual Machine. It contains 
eBPF assembler, disassembler, interpreter, and JIT compiler for x86-64. While the BPF programs are 
intented to run in the kernel, the uBPF project enables running the BPF programs in user-space applications. Therefore, the uBPF Virtual Machine can be used in any solution implementing the kernel bypass (e.g. DPDK/AF_XDP apps).

Moreover, contrary to the eBPF implementation, uBPF is not licensed under GPL. The uBPF implementation is licensed under
Apache License, version 2.0. 

## P4rt-OVS

Open vSwitch (OVS) is a widely adopted high-performance programmable virtual switch. P4rt-OVS is an extension of Open vSwitch that integrates the BPF virtual machine with the userspace datapath of OVS. Hence, P4rt-OVS allows to extend the OVS packet processing pipeline without recompilation by injecting BPF programs at runtime. BPF programs act as programmable actions and they are referenced as a new OVS action (prog) in the OpenFlow tables. Programmable actions are allowed to write to packets as well as read and write to persistent maps (hash tables) to retain information on flows.

Furthermore, a user can use the P4 language to develop new, protocol-independent data plane extensions (BPF programs) for Open vSwitch. P4 provides a high-level and declarative language, so writing a new network features becomes super easy! p4c-ubpf, the uBPF back-end for the P4 compiler, provides the architecture model to write P4 programs making use of wide range of P4 features including stateful registers.

# Compiling P4 to uBPF


```
         --------------              -------
P4_16 --->  | P4-to-uBPF | ---> C ----> | clang/BCC | --> uBPF
         --------------              -------
```

ubpf_model.p4


# p4c-ubpf vs. other BPF-related compilers

Table with comparsion of features of p4c-ubpf, p4c-ebpf, p4c-xdp

|             P4 feature             | p4c-ebpf | p4c-xdp | p4c-ubpf |
|:----------------------------------:|:--------:|:-------:|:--------:|
|          Packet filtering          |    YES   |   YES   |    YES   |
| Packet's modifications & tunneling |    NO    |   YES   |    YES   |
|      Simple packet forwarding      |          |         |          |
|              Registers             |    NO    |   NO    |    YES   |
|              Counters              |    YES   |   YES   |    NO    |
|        Checksum computation        |    NO    |   YES   |    YES   |

# Summary

For questions or comments, please send an email to tomasz.osinski2@orange.com. 

# Quick links

[P4-uBPF - presentation from Open vSwitch and OVN Fall 2019 conference](https://www.openvswitch.org/support/ovscon2019/#4.3F)

[P4rt-OVS - Github repository](https://github.com/Orange-OpenSource/p4rt-ovs)
