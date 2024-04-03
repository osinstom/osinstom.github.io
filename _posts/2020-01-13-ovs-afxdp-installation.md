---
layout: post
title: OVS_AFXDP - step-by-step installation guide
date: 2020-01-13
tags: OVS AF_XDP XDP
categories: tutorial
toc:
  beginning: true
---

## Introduction

[OVS_AFXDP](http://docs.openvswitch.org/en/latest/intro/install/afxdp/) is a new datapath implementation for Open vSwitch. The new datapath is based on [eXpress Data Path (XDP)](https://cilium.readthedocs.io/en/latest/bpf/) - the in-kernel hook for eBPF programs designed to provide high-performance packet processing subystem in Linux. AF_XDP is a new socket type (address family) that is built on top of XDP. AF_XDP redirects incoming packets to memory buffer in a user-space application.

AF_XDP in Open vSwitch is expected to provide similar performance to the DPDK datapath, but with a lower configuration overhead. If AF_XDP will become a successful implementation it would allow to port existing kernel-based OVS deployments to the user-space implementations providing better packet processing performance.

From my perspective, OVS_AFXDP is interesting as it can be the solution for P4rt-OVS (P4-capable Open vSwitch developed by my team at Orange Labs Poland), which requires to process packets in the user-space and is currently based on DPDK. Hence, I decided to test OVS_AFXDP and evaluate how it can be integrated to P4rt-OVS. This post describes the installation process that I went through. As there is only the official documentation on how to install OVS_AFXDP, this post can be a useful extension.

## Installation of OVS_AFXDP

According to the official documentation, OVS_AFXDP requires at least kernel 5.0.0. I installed OVS_AFXDP on Ubuntu 18.10, which comes with kernel 4.18 already integrated. Kernel 4.18 has some initial support for XDP, but it is not suitable for OVS_AFXDP. Hence, we need to install the newer kernel first. I recommend you to install kernel 5.4.1 or higher because it introduces important modifications to how AF_XDP works.

### Building kernel with the XDP support

I decided to install the latest stable version of Linux - 5.4.12:

```
sudo apt install -y build-essential libncurses-dev bison flex libssl-dev
wget https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-5.4.12.tar.xz
unxz -v linux-5.4.12.tar.xz
wget https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-5.4.12.tar.sign
gpg --verify linux-5.4.12.tar.sign
```

The sample output will be:

```
gpg: assuming signed data in 'linux-5.4.12.tar'
gpg: Signature made Sun 12 Aug 2018 04:00:28 PM CDT
gpg:                using RSA key 647F28654894E3BD457199BE38DBBDC86092693E
gpg: Can't check signature: No public key
```

Copy RSA to the clipboard and run:

```
gpg --recv-keys 647F28654894E3BD457199BE38DBBDC86092693E
gpg --verify linux-5.4.12.tar.sign
```

Now, we can move to the installation process. Extract Linux package:

```
tar xvf linux-5.4.12.tar
```


Enter linux directory, make config and make sure that following options are enabled:

```bash
# Open config editor and save it to .config
$ make menuconfig
# or you can copy the current one:
$ cp -v /boot/config-$(uname -r) .config
# Check if following options are enabled:
# CONFIG_BPF=y
# CONFIG_BPF_SYSCALL=y
# CONFIG_XDP_SOCKETS=y
```

Then, build the kernel:

```bash
make -j $(nproc)
sudo make modules_install INSTALL_MOD_STRIP=1
sudo make install
```

The next, important step is to install kernel's headers. They are used by userspace programs (such as Open vSwitch) to interface with kernel services. In other words, kernel's headers provide the API for userspace programs. For instance, in case of OVS_AFXDP, `if_xdp.h` provides the API to the XDP socket.

`sudo make INSTALL_HDR_PATH=/usr headers_install`

After system's reboot you should have up and running Linux 5.4.12 that will allow you to install OVS_AFXDP without any problems.

### Installing OVS_AFXDP

Firstly, let's install required tools and dependencies:

`sudo apt install -y git make gcc libelf-dev autoconf libtool`

Next, clone the OVS repository:

`git clone  https://github.com/openvswitch/ovs`

Then, according to the official documentation, the `libbpf` should be installed:

```bash
git clone git://git.kernel.org/pub/scm/linux/kernel/git/bpf/bpf-next.git
cd bpf-next/
cd tools/lib/bpf/
make
sudo make install
sudo make install_headers
```

In my case, above commands were not enough. I had to copy the `libbpf` shared library to location, where all libraries are stored and create a symbolic link. I based on the [tutorial from Intel](https://software.intel.com/en-us/articles/install-a-unix-including-linux-shared-library).

```bash
# from bpf-next/tools/lib/bpf/
sudo cp libbpf.so.0 /usr/lib/
sudo cp libbpf.so.0.0.7 /usr/lib/
sudo ldconfig -v -n /usr/lib
sudo ln -sf /usr/lib/libbpf.so.0 /usr/lib/libbpf.so.0.0.7
sudo ldconfig
ldconfig -p | grep bpf
# You should have libbpf listed in the output of the above command.
```

Now, let's configure OVS.

```bash
cd ovs/
./boot.sh
./configure --enable-afxdp
```

At this stage, if you use older kernel (e.g. 4.18 or even 5.0.0) you will get the following error during configuration process. This error will also appear if the command `sudo make INSTALL_HDR_PATH=/usr headers_install` has not been invoked.

```
configure: WARNING: bpf/xsk.h: present but cannot be compiled
configure: WARNING: bpf/xsk.h:     check for missing prerequisite headers?
configure: WARNING: bpf/xsk.h: see the Autoconf documentation
configure: WARNING: bpf/xsk.h:     section "Present But Cannot Be Compiled"
configure: WARNING: bpf/xsk.h: proceeding with the compiler's result
configure: WARNING:     ## ----------------------------------- ##
configure: WARNING:     ## Report this to bugs@openvswitch.org ##
configure: WARNING:     ## ----------------------------------- ##
checking for bpf/xsk.h... no
configure: error: unable to find bpf/xsk.h for AF_XDP support
```

If we would look at `config.log` we can see the following message:

```
configure:18659: checking bpf/xsk.h usability
configure:18659: gcc -c -g -O2  conftest.c >&5
In file included from conftest.c:69:
/usr/local/include/bpf/xsk.h: In function 'xsk_ring_prod__needs_wakeup':
/usr/local/include/bpf/xsk.h:82:21: error: 'XDP_RING_NEED_WAKEUP' undeclared (first use in this function)
  return *r->flags & XDP_RING_NEED_WAKEUP;
                     ^~~~~~~~~~~~~~~~~~~~
/usr/local/include/bpf/xsk.h:82:21: note: each undeclared identifier is reported only once for each function it appears in
/usr/local/include/bpf/xsk.h: In function 'xsk_umem__extract_addr':
/usr/local/include/bpf/xsk.h:173:16: error: 'XSK_UNALIGNED_BUF_ADDR_MASK' undeclared (first use in this function)
  return addr & XSK_UNALIGNED_BUF_ADDR_MASK;
                ^~~~~~~~~~~~~~~~~~~~~~~~~~~
/usr/local/include/bpf/xsk.h: In function 'xsk_umem__extract_offset':
/usr/local/include/bpf/xsk.h:178:17: error: 'XSK_UNALIGNED_BUF_OFFSET_SHIFT' undeclared (first use in this function)
  return addr >> XSK_UNALIGNED_BUF_OFFSET_SHIFT;
                 ^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
```

This is caused by the old version of `if_xdp.h` that does not provide declaration of `XDP_RING_NEED_WAKEUP` and others. _If you get this error, come back to the section `Building kernel with the XDP support` and install kernel 5.4.12, which comes with `if_xdp.h` supporting those declarations._

If `./configure` has been completed successfully, let's build OVS_AFXDP:

```
make -j $(nproc)
sudo make install
```

Voila! OVS_AFXDP is ready to be run!

### Running OVS_AFXDP

It is recommended to run tests first to check basic AF_XDP functionality:

`make check-afxdp TESTSUITEFLAGS='1'`

**Note!** If `libbpf` has not been installed properly the test will fail with the following message:

```
020-01-17 06:54:19.418142218 +0000
@@ -0,0 +1 @@
+ovsdb-tool: error while loading shared libraries: libbpf.so.0: cannot open shared object file: No such file or directory
./system-afxdp.at:5: exit code was 127, expected 0
```

In my case I had to fix the installation of `libbpf`.

If tests were passed, we can move on and run OVS_AFXDP! Firstly, let's run OVSDB and `ovs-vswitchd`.

```
sudo mkdir -p /usr/local/etc/openvswitch
sudo ovsdb-tool create /usr/local/etc/openvswitch/conf.db vswitchd/vswitch.ovsschema
sudo mkdir -p /usr/local/var/run/openvswitch
sudo ovsdb-server --remote=punix:/usr/local/var/run/openvswitch/db.sock \
    --remote=db:Open_vSwitch,Open_vSwitch,manager_options \
    --pidfile --detach
sudo ovs-vswitchd --pidfile --detach    
```

Then, let's configure OVS with the _netdev_ datapath:

```
sudo ovs-vsctl -- add-br br0 -- set Bridge br0 datapath_type=netdev
```

OVS_AFXDP can be configured with both physical and virutal interfaces. For the test purpose, I use `veth` interfaces.

Create two `veth` pairs and attach them to OVS:

```
sudo ip netns add test0
sudo ip link add port0 type veth peer name peer0
sudo ip link set port0 netns test0
sudo ip link set dev peer0 up
sudo ovs-vsctl add-port br0 peer0 -- set interface peer0 external-ids:iface-id="port0" type="afxdp"

sudo ip netns exec test0 sh << NS_EXEC_HEREDOC
ip addr add "10.1.1.1/24" dev port0
ip link set dev port0 up
NS_EXEC_HEREDOC

sudo ip netns add test1
sudo ip link add port1 type veth peer name peer1
sudo ip link set port1 netns test1
sudo ip link set dev peer1 up
sudo ovs-vsctl add-port br0 peer1 -- set interface peer1 external-ids:iface-id="port1" type="afxdp"

sudo ip netns exec test1 sh << NS_EXEC_HEREDOC
ip addr add "10.1.1.2/24" dev port1
ip link set dev port1 up
NS_EXEC_HEREDOC
```

The final configuration of OVS should looks as follows:

```
ubuntu@ovsafxdp:~/ovs$ sudo ovs-vsctl show
e7c40460-0252-4c98-a225-44416c01ead2
    Bridge br0
        datapath_type: netdev
        Port peer1
            Interface peer1
                type: afxdp
        Port br0
            Interface br0
                type: internal
        Port peer0
            Interface peer0
                type: afxdp
```

To test if OVS_AFXDP works, let's run `ping` in both directions:

```
ubuntu@ovsafxdp:~/ovs$ sudo ip netns exec test0 ping 10.1.1.2
PING 10.1.1.2 (10.1.1.2) 56(84) bytes of data.
64 bytes from 10.1.1.2: icmp_seq=1 ttl=64 time=0.179 ms
64 bytes from 10.1.1.2: icmp_seq=2 ttl=64 time=0.110 ms
64 bytes from 10.1.1.2: icmp_seq=3 ttl=64 time=0.106 ms

ubuntu@ovsafxdp:~/ovs$ sudo ip netns exec test1 ping 10.1.1.1
PING 10.1.1.1 (10.1.1.1) 56(84) bytes of data.
64 bytes from 10.1.1.1: icmp_seq=1 ttl=64 time=0.820 ms
64 bytes from 10.1.1.1: icmp_seq=2 ttl=64 time=0.104 ms
64 bytes from 10.1.1.1: icmp_seq=3 ttl=64 time=0.086 ms
```

## Summary

In this post, I described the installation and configuration process to make OVS_AFXDP up and running. As I encountered some problems on the way to install OVS_AFXDP I thought that it was worth sharing my experience with the community. Hence, this post can be a useful complement to the official documentation of OVS_AFXDP. Enjoy!

The next step is to run our P4rt-OVS prototype with AF_XDP and get rid of DPDK. We also consider to integrate OVS_AFXDP with Mininet to provide researchers and network engineers a simple tool to run and test P4rt-OVS, without the need for DPDK.