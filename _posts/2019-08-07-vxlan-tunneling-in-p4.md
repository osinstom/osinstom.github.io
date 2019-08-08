---
date: '2019-08-07 14:33 +0200'
layout: single
published: false
title: VXLAN tunneling in P4
---
## Introduction

Recently, I have been implementing the support for packet tunneling in our [P4C-to-uBPF](https://github.com/P4-Research/p4c/tree/master/backends/ubpf) compiler. However, in order to deeply understand P4 constructs describing tunneling I have created the reference implementation for BMv2 switch. 

This blog post describes how to implement more complex tunneling technique (like VXLAN) in the P4 language.

## Short introduction to VXLAN

## Design and implementation of VXLAN in P4

It is a good practice to design P4 programs (especially those that perform tunneling) by dividing the P4 program into four functional blocks:

- **_Upstream ingress_** - 
- Upstream egress
- Downstream ingress
- Downstream egress 

## Summary
