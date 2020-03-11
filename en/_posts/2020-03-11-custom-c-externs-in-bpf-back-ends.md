---
date: '2020-03-11 21:24 +0100'
layout: single
published: false
title: Custom C externs in BPF back-ends
---
## Introduction

P4 is a powerful language, which can descibe a majority of network-related operations in a declarative manner. However, there are some use cases, which cannot be natively implemented in the P4 language. Thankfully, P4 provides the concept of extern objects - architecture-specific constructs that can be manipulated by P4 programs through well-defined APIs, but are not programmable using P4. The implementation of a particular extern object is provided by the P4 target and its API is defined in the architecture model.

However, there are some platforms (mostly software one), which can be extended with a custom, user-defined extern function. These functions are provided by a developer and are injected right before a target-specific binary is deployed. The good example is custom extern support provided by BMv2 or the use of the C sandbox in the Netronome Network Flow Processor (NFP) programming.
