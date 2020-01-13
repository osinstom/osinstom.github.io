---
date: '2020-01-13 08:12 +0100'
layout: single
published: false
title: en/_posts/2020-01-13-ovs-afxdp-installation.md
categories:
  - tutorial
tags:
  - ovs
  - afxdp
  - xdp
---
## Introduction

[OVS_AFXDP](http://docs.openvswitch.org/en/latest/intro/install/afxdp/) is a new datapath (or _netdev_) implementation for Open vSwitch. The new datapath is based on [eXpress Data Path (XDP)](https://cilium.readthedocs.io/en/latest/bpf/) - an in-kernel hook for eBPF programs designed to provide high-performance packet processing subystem in Linux. AF_XDP is a new socket type (address family) that is built on top of XDP. AF_XDP redirects incoming packets to memory buffer in a user-space application. 

AF_XDP in Open vSwitch is expected to provide similar performance to the DPDK datapath, but with a lower configuration overhead. If AF_XDP will become a successful implementation it would allow to port existing kernel-based OVS deployments to the user-space implementations providing better packet processing performance. 

From my perspective,  OVS_AFXDP is interesting as it can be the solution for P4rt-OVS (P4-capable Open vSwitch developed by my team at Orange Labs Poland), which requires to process packets in the user-space and is currently based on DPDK. Hence, I decided to test OVS_AFXDP and evaluate how it can be integrated to P4rt-OVS. This post describes the installation process that I went through. As there is only the official documentation on how to install OVS_AFXDP this post can be a useful extension. 

## Installation of OVS_AFXDP





