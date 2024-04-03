---
layout: post
title: p4c-ubpf - the new back-end for the P4 compiler!
date: 2020-02-06
tags: P4 uBPF
categories: article
toc:
  sidebar: left
---

NOTE: This blog post was originally published on P4.org: https://opennetworking.org/news-and-events/blog/p4c-ubpf-a-new-back-end-for-the-p4-compiler/.

<hr>

With the constant development of the P4 language more and more programmable targets are emerging. The P4 compiler has already support for the next-generation Linux datapath such as eBPF/XDP. However, it is sometimes required to introduce runtime extensibility mechanism in a user-space packet processing applications. It can be achieved by using [the user-space BPF (uBPF) Virtual Machine](https://github.com/iovisor/ubpf), which is a re-implementation of in-kernel eBPF VM and provides a user-space execution environment, which can be extended at runtime.

This blog post introduces **p4c-ubpf** - the new back-end for the P4 compiler - that enables programming packet processing modules for uBPF. The p4c-ubpf allows to execute the P4 code in any solution implementing the kernel bypass (e.g. DPDK or AF_XDP applications).

# Userspace BPF for packet processing

## Why uBPF?

The uBPF project [1] re-implements the eBPF kernel-based Virtual Machine. It contains
eBPF assembler, disassembler, interpreter, and JIT compiler for x86-64. While the BPF programs are
intented to be run in the kernel, the uBPF project enables running the BPF programs in user-space applications. Therefore, the uBPF Virtual Machine can be well-integrated with the kernel bypass (e.g. DPDK/AF_XDP) applications.

Moreover, contrary to the eBPF implementation, uBPF is not licensed under GPL. The uBPF implementation is licensed under Apache License, version 2.0. Finally, the userspace eBPF implements less complex virtual machine, so that some constructs are not supported (e.g. tail calls), but, on the other hand, the stack size of the uBPF program is not limited to 512 bytes.

## P4rt-OVS

Open vSwitch (OVS) is a widely adopted high-performance programmable virtual switch. P4rt-OVS is an extension of Open vSwitch that integrates the BPF virtual machine with the userspace datapath of OVS. Hence, P4rt-OVS allows to extend the OVS packet processing pipeline without recompilation by injecting BPF programs at runtime. BPF programs act as programmable actions and they are referenced as a new OVS action (keyword `prog`) in the OpenFlow tables. Programmable actions are allowed to write to packets as well as read and write to persistent maps (hash tables) to retain information on flows.

Furthermore, a user can use the P4 language to develop new, protocol-independent data plane extensions (BPF programs) for Open vSwitch. P4 provides a high-level and declarative language, so writing a new network features becomes super easy! p4c-ubpf, the uBPF back-end for the P4 compiler, provides the architecture model to write P4 programs making use of wide range of P4 features including stateful registers.

# Compiling P4 to uBPF

The P4-to-uBPF compiler follows the same convention as P4 compilers for eBPF or XDP backends, i.e. the P4 program is firstly translated to the C representation and, then, compiled to the BPF code using `clang` compiler. It makes things a little bit easier as P4 compiler does not need to generate low-level BPF instructions.

```
            ------------              ---------
P4_16 --->  | p4c-ubpf | ---> C ----> | clang | --> uBPF
            ------------              ---------
```

We designed a new architecture model for P4c-uBPF (depicted below). The `ubpf_model` architecture consists of a single parser, match-action pipeline, and deparser. We made the decision to disable packet forwarding in the first version, what simplifies the design, but can be treated as a limitation. It means it is the responsibility of the underlaying target to determine output port for incoming packets. P4rt-OVS is implemented according to this design principle. However, p4c-ubpf can be enhanced to support packet forwarding in the next releases.

![p4c-ubpf-architecture-model.png]({{site.baseurl}}/en/_posts/p4c-ubpf-architecture-model.png)

The p4c-ubpf compiler provides also a library of *extern* functions that implement features not supported by the P4 language. These functions can be called from the P4 program as a normal action. The `ubpf` architecture model supports such operations as hash functions, stateful registers, timestamp retrieving and checksum computation. To see the heavily commented, full specification of the architecture model see [this link](https://github.com/p4lang/p4c/blob/master/backends/ubpf/p4include/ubpf_model.p4).

## Translating P4 to C

The key operation that is performed by p4c-ubpf is translation from P4 to C. The following tables provide a brief summary of how each P4 construct is mapped to a corresponding C construct. Note that the translation is very similar to `p4c-ebpf` and `p4c-xdp`.

#### Translating parser

P4 Construct | C Translation
----------|------------
`header`  | `struct` type with an additional `valid` bit
`struct`  | `struct`
parser state  | code block
state transition | `goto` statement
`extract` | load/shift/mask data from packet buffer

#### Translating match-action pipelines

P4 Construct | C Translation
----------|------------
table     | eBPF map
table key | `struct` type
table `actions` block | tagged `union` with all possible actions
`action` arguments | `struct`
table `reads` | eBPF map's lookups
`action` body | code block
table `apply` | `switch` statement
registers  | additional eBPF map
register `reads` | eBPF map's lookups
register `writes` | eBPF map's updates

#### Translating deparser

P4 Construct | C Translation
----------|------------
`apply` block  | code block + adjusting packet's size
`emit` operation | header's validity check + write/shift/mask data to packet buffer

# p4c-ubpf vs. other BPF-related compilers

The uBPF is yet another BPF-related backend for P4. `p4c-ebpf` generates programs to be attached to the Linux TC subsystem, `p4c-xdp` targets XDP hook, while `p4c-ubpf` produces code to be run in at the user-space level. There are differences in the range of functionalities that these P4 backends support. The table below provides a brief comparison of features provided by each BPF-related backend.

#### Comparsion of features provided by p4c-ebpf, p4c-xdp and p4c-ubpf

|               Feature              | p4c-ebpf | p4c-xdp | p4c-ubpf |
|:----------------------------------:|:--------:|:-------:|:--------:|
|          Packet filtering          |    YES   |   YES   |    YES   |
| Packet's modifications & tunneling |    NO    |   YES   |    YES   |
|      Simple packet forwarding      |    YES   |   YES   |    NO    |
|              Registers             |    NO    |   NO    |    YES   |
|              Counters              |    YES   |   YES   |    NO    |
|        Checksum computation        |    NO    |   YES   |    YES   |

# Summary

The uBPF backend for the P4 compiler can be used for any application that processes packets in a user space. It has already been used to implement various, simple applications such as stateful firewall, rate limiter or GTP tunneling. For instance, in case of P4rt-OVS, `p4c-ubpf` allows to implement network protocols, which are not currently supported by Open vSwitch. See [this link](https://github.com/p4lang/p4c/tree/master/backends/ubpf/examples) for more examples.

We encourage community to start playing with uBPF backend, report bugs and propose new enhancements. For questions or comments, please send an email to tomasz.osinski2@orange.com.

# Quick links

[BPF and XDP Reference Guide](https://docs.cilium.io/en/v1.6/bpf/)

[Background on P4 and eBPF](https://github.com/p4lang/p4c/blob/master/backends/ebpf/README.md)

[P4-uBPF - presentation from Open vSwitch and OVN Fall 2019 conference](https://www.openvswitch.org/support/ovscon2019/#4.3F)

[P4rt-OVS - Github repository](https://github.com/Orange-OpenSource/p4rt-ovs)