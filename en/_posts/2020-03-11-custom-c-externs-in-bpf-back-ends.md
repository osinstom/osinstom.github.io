---
date: '2020-03-11 21:24 +0100'
layout: single
published: false
title: Custom C externs in BPF back-ends
categories: ''
tags: ''
---
## Introduction

P4 is a powerful language, which can descibe a majority of network-related operations in a declarative manner. However, there are some use cases, which cannot be natively implemented in the P4 language. Thankfully, P4 provides the concept of extern objects - architecture-specific constructs that can be manipulated by P4 programs through well-defined APIs, but are not programmable using P4. The implementation of a particular extern object is provided by the P4 target and its API is defined in the architecture model.

However, there are some platforms (mostly software one), which can be extended with a custom, user-defined extern function. These functions are provided by a developer and are injected right before a target-specific binary is deployed. The good example is the support for custom externs provided by BMv2 or [the use of the C sandbox in the Netronome Network Flow Processor (NFP) programming](https://www.netronome.com/m/documents/WP_Programming_with_P4_and_C_.pdf).

Recently, we have also added support for custom extern functions for BPF-related back-ends of the P4 compiler. The new feature is briefly presented in this post.

# Workflow

The general workflow is depicted below. 



Basically, the P4 to BPF compilers translate program written in P4_16 to the subset of C, which is compatible to the eBPF virtual machine. Then, the C program is compiled down to BPF code using `clang` and the generated code can be injected to eBPF VM. 

With the support for custom C externs, an additional C file implementing custom extern function can be now mixed with the C code generated from the P4 program. For inclusion of the custom C extern into the P4 code, users need to define the action as `extern` object. The defintion of the `extern` object should follow P4 convention and declare name, arguments (with [directional parameters](https://p4.org/p4-spec/docs/P4-16-v1.2.0.html#sec-calling-convention)) and return type, for instance:

```
extern bit<16> incremental_checksum(in bit<16> csum, in bit<32> old, in bit<32> new);
```

Optionally, `extern` can take some P4 header defintion as argument:

```
extern bool verify_ipv4_checksum(in IPv4_h iphdr);
```

Furthermore, users need to pass `--emit-externs` flag to the `p4c-ebpf` or `p4c-ubpf` to instruct the compiler not to warn about user-defined externs. 

That's all, what a programmer has to do to define a new, user-defined extern function. The last part is to write an actual implementation of extern in C.

# How to write a custom C extern function?

Custom externs provides a powerful mechanism to extend P4-based data plane programs with user-defined features. For instance, users can provide support for custom hash functions, checksum computation or verfication, or even stateful packet processing using BPF maps embedded into the C extern function!

All a user must do is to provide eBPF-compatible (acceptable by the BPF verifier) C implementation of extern function. When writing the C code a developer must be aware of how the P4 compiler translates P4 to the C constructs. The simple rules are listed in the documentation. Even though the support for custom C externs is implemented similarily in both `p4c-ebpf` and `p4c-ubpf`, there is a significant, but straightforward, difference in writing the C code for these targets. As eBPF is the in-kernel subsystem it consumes only restricted subset of C. It means that a programmer must use kernel-space data types. Moreover, she or he is limited to the BPF helpers provided by the eBPF VM - any custom libraries are not allowed by the BPF verifier. Similarily, custom C externs for `p4c-ubpf` must be written in a user-space subset of C and external calls should be limited to these provided by uBPF VM.

Following these rules a programmer can write useful extensions. A good example is a stateful C extern that tracks the TCP connection and implements a stateful firewall. The full code is available in the repository. Let's take this example. The BPF map can be defined as simply as:

```C
REGISTER_START()
REGISTER_TABLE(tcp_reg, BPF_MAP_TYPE_HASH, sizeof(u32), sizeof(struct connInfo), MAX_ENTRIES)
REGISTER_END()
```

Then, the BPF map can be simply used further:

```C
struct connInfo *info = BPF_MAP_LOOKUP_ELEM(tcp_reg, &conn);
...
BPF_MAP_UPDATE_ELEM(tcp_reg, &conn, &new_info, 0);
...
BPF_MAP_DELETE_ELEM(tcp_reg, &conn);
```

# Summary



Apprently, this







