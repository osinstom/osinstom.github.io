---
date: '2020-02-11 20:42 +0100'
layout: single
published: false
title: My notes from podcast "Why doesn't OVS support P4?"
---

### Why not PISCES?

1. It is only DPDK-based. It does not support kernel datapath or HyperV.
2. A bit outdated (based on the old version of OVS), but could be forward ported.
3. The main reason why it has not been integrated: Not compatible with existing OVS features. Lack of backward compatibility.

### Is P4 suitable for software switches? 

P4 is more designed for hardware, but most of the features can be realized also in software.

What is hard in software, but easy in hardware?

* checksums - computation of them can be expensive in software. It should be done incrementally. 
* a few more..

Ben proposes to include only Parser in the P4_16 architecture model for OVS, because P4 model nicely describes hardware pipeline, but for software switches it does not make sense to specify fixed tables, what actions the table needs to have and fixed packet processing pipeline in advance. 


