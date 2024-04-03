---
layout: post
title: My notes from podcast "Why doesn't OVS support P4?"
date: 2020-02-11
tags: P4 OVS PISCES
categories: article
---

The OVS Orbit podcast "User-Configurable Protocol Support for OVS, or Why Doesn't OVS Support P4?" [1] was recorded at the Dagstuhl seminar on programmable data planes in April 2019. It explains the reasons that OVS doesn't already have support for P4, what's changing, and likely future directions. There are my notes (quick summary) from this podcast below.

### Why not PISCES [2]?

1. It is only DPDK-based. It does not support kernel datapath or HyperV.
2. A bit outdated (based on the old version of OVS), but could be forward-ported.
3. The main reason why it has not been integrated: Not compatible with existing OVS features. Lack of backward compatibility.

### Is P4 suitable for software switches?

P4 is more designed for hardware, but most of the features can be realized also in software.

What is hard in software, but easy in hardware?

* checksums - computation of them can be expensive in software. It should be done incrementally.
* a few more..

Ben proposes to include only Parser in the P4_16 architecture model for OVS, because P4 model nicely describes hardware pipeline, but for software switches it does not make sense to specify fixed tables, what actions the table needs to have and fixed packet processing pipeline in advance.

### Why is it hard to have user-configurable protocols (P4 support) in OVS?

1. Fixed interface between slowpath (ovs-vswitchd) and multiple datapaths. There are difficulties to make it protocol-independent.
2. Version compatiblity with kernel module (not maintained by OVS)

### How we can implement P4 support in OVS?

1. eBPF
* **Option #1:** Add OVS action that executes eBPF code
* **Option #2:** Re-write kernel datapath in eBPF/XDP, but there are problems with it (e.g. limited number of instructions, performance, tail calls).
    * In case of eBPF, restrictions of P4 language on tables (defining them in advance) can make it easier to integrate P4 with eBPF.
    * eBPF is slower than OVS kernel module, but more flexible: you can tailor kernel module to user-configurable protocols.
2. Get rid of kernel module at all and use just packet interface (like DPDK). So far, it was not possible to get rid of kernel module because there was no fast kernel-user interface. **However, there is a new packet interface called AF_XDP that provides fast kernel-user interface!**
    * Disadvantage: It would be tough to force enterprise users to get rid of kernel module and use AF_XDP.


### References

[1] https://ovsorbit.org/#e69

[2] Shahbaz et al., “PISCES: A Programmable, Protocol-Independent Software Switch”, ACM SIGCOMM 2016