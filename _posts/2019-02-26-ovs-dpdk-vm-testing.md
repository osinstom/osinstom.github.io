---
layout: single
published: false
date: {}
categories:
  - NFV
  - OVS-DPDK
  - Performance testing
  - Data plane
tags:
  - DPDK
  - OVS
  - Linux
title: Configuring OVS-DPDK with VM
---
## Configuring OVS-DPDK with VM for performance testing

Recently, I work on a performance comparison between virtualization technologies. In order to make an evaluation I had to setup a test environment based on OVS-DPDK and KVM-based Virtual Machine (refer to test scenario below). This user guide shows how to install and configure the PHY-VM-PHY scenario with OVS-DPDK and libvirt.

// TODO: 

### Prerequisites

Before starting installation of OVS-DPDK and VMs, let's prepare OS.

```
sudo apt-get update
sudo apt-get upgrade

sudo apt-get -y install git qemu-system-x86 python-pip fuse libfuse-dev dh-autoreconf openssl libssl-dev cmake libpcap-dev python-yaml libnuma-dev
```

### Installing OVS-DPDK

Firstly, we need to install DPDK and Open vSwitch from a source code. To install DPDK run below commands:

```
cd $HOME & mkdir dpdk
cd dpdk/
wget http://fast.dpdk.org/rel/dpdk-18.11.tar.xz
tar xf dpdk-18.11.tar.xz
cd dpdk-18.11/
```

Then, we need to export environment variables, which point out to DPDK..

```
export DPDK_DIR=$HOME/dpdk/dpdk-18.11
export DPDK_TARGET=x86_64-native-linuxapp-gcc
export DPDK_BUILD=$DPDK_DIR/$DPDK_TARGET
```

.. and install DPDK. Note that we will use special flags (_-g -Ofast -march=native -Q_) to achieve a better performance of OVS-DPDK.

`EXTRA_CFLAGS="-g -Ofast" make install -j T=$target CONFIG_RTE_BUILD_COMBINE_LIBS=y CONFIG_RTE_LIBRTE_VHOST=y DESTDIR=install`

If the installation of DPDK has been successful, you can install OVS-DPDK.

```
cd $HOME/dpdk/
git clone https://github.com/openvswitch/ovs
cd ovs
./boot.sh
./configure CFLAGS="-g -Ofast" --with-dpdk=$DPDK_BUILD
make -j CFLAGS="-g -Ofast -march=native -Q"
sudo make install
```

Now, you should be able to verify OVS-DPDK installation by using below commands:

```
tomek@s14-2:~$ sudo ovs-vsctl show
3bb620bf-4d6f-4ddc-94ff-03f1ff9ccc93
```

```
tomek@s14-2:~$ sudo ovs-vswitchd --version
ovs-vswitchd (Open vSwitch) 2.11.90
DPDK 18.11.0
```

### Configuring OVS-DPDK

Firstly, let's configure DPDK ports. Following commands inject required kernel drivers (i.e. uio, igb_uio, vfio). It is up to you, which one you would like to use. In order to choose one refer to https://doc.dpdk.org/guides/linux_gsg/linux_drivers.html. For our purposes we have used _uiopcigeneric_.

```
cd dpdk/dpdk-18.11/usertools/
sudo modprobe uio_pci_generic
```

If kernel modules has been injected NICs can be attached to DPDK. Note that you need to use the *bus-info* format (e.g.0000:88:00.0). To retrieve NIC ID in the bus-info format use:

`lspci | grep Ethernet`

This command will list all interfaces along with the bus-info identifier. Then, use dpdk-devbind.py script to bind chosen interfaces with DPDK drivers.

```bash
sudo ./dpdk-devbind.py -b uio_pci_generic 0000:88:00.0
sudo ./dpdk-devbind.py -b uio_pci_generic 0000:88:00.1
```

You can check if interfaces have been bound using:

```
tomek@s14-2:~/dpdk/dpdk-18.11$ usertools/dpdk-devbind.py --status

Network devices using DPDK-compatible driver
============================================
0000:88:00.0 '82599ES 10-Gigabit SFI/SFP+ Network Connection 10fb' drv=uio_pci_generic unused=ixgbe
0000:88:00.1 '82599ES 10-Gigabit SFI/SFP+ Network Connection 10fb' drv=uio_pci_generic unused=ixgbe
```
Physical memory is segmented into contiguous regions called pages. 
If Ethernet interfaces have been bound to DPDK, it's time to mount hugepages. Hugepages are contiguous regions, which are segments of physical memory. In order to allocate hugepages persistently I have added following parameters to GRUB_CMDLINE_LINUX_DEFAULT in _/etc/default/grub_:

`GRUB_CMDLINE_LINUX_DEFAULT="default_hugepagesz=1G hugepagesz=1G hugepages=16 hugepagesz=2M hugepages=2048"`

Then, upgrade grub and reboot a machine:

```
sudo update-grub
sudo reboot
```

After restart, mount hugepages using:

```
sudo mkdir -p /mnt/huge
sudo mount -t hugetlbfs nodev /mnt/huge
```

You can validate if hugepages has been configured by:

`grep -i huge /proc/meminfo`

Great, the DPDK environment should be configured now. We can move to the configuration of OVS. Firstly initialize OVS brigde with DPDK capabilities:

```
sudo ovs-vsctl --no-wait init
sudo ovs-vsctl --no-wait set Open_vSwitch . other_config:dpdk-init=true
```

The dpdk-init=true should be applied. To validate use below command, which should return the _true_ value.

`sudo ovs-vsctl get Open_vSwitch . dpdk_initialized`

Now, we need to define other OVS parameters to be used by the DPDK ports. These are:

- **other_config:dpdk-hugepage-dir** - points to a directory, where hugepages are mounted.
- **other_config:dpdk-socket-mem** - a comma seperated list of hugepage memory, specified in MBs per NUMA node, allocated to the ovs-vswitchd to use for the DPDK dataplane
- **other_config:dpdk-lcore-mask** - a bitmask of what CPU core to pin to non-dataplane threads of the ovs-vswitchd to.
- **other_config:pmd-cpu-mask** - a bitmask of what CPU core to pin to the dataplane-related (Poll Mode Driver, PMD) threads of the ovs-vswitchd to. Each bit set in the bitmask result in the creating of the PMD thread.
- **other_config:pmd-rxq-affinity** - it is set per Interface. It pins a queue of port to the given CPU core. This parameter is optional, but in some circumstances it can be used to pin a queue of port to the specific CPU core.

The first two options are quite straightforward and can be configured with:

```
sudo ovs-vsctl --no-wait set Open_vSwitch . other_config:dpdk-socket-mem="4096M"
sudo ovs-vsctl --no-wait set Open_vSwitch . other_config:dpdk-hugepage-dir="/mnt/huge"
```

Now, to configure _dpdk-lcore-mask_ and _pmd-cpu-mask_ we need to find out how our server is configured. In particular, we need to know how many NUMA nodes our server has and how CPU cores are allocated across NUMA nodes.

Just to clarify, NUMA stands for Non-Uniform Memory Access. In NUMA system memory is divided into zones called nodes, which are allocated to particular CPUs or sockets. Access to memory that is local to a CPU is faster than memory connected to remote CPUs on that system. Normally, each socket on a NUMA system has a local memory node whose contents can be accessed faster than the memory in the node local to another CPU or the memory on a bus shared by all CPUs.

Because of above mentioned characteristics we should configure OVS-DPDK with NUMA-awareness. In order to check NUMA topology on the server use:

```
lscpu
--- 

NUMA node0 CPU(s):     0-9,20-29

NUMA node1 CPU(s):     10-19,30-39
```

In our case we have two NUMA nodes (0 and 1). The CPU cores 0-9 and 20-29 are associated with NUMA node0, while the others are associated with NUMA node1. 

Now, for the physical ports (88:00.0 and 88:00.1 in our case) that will be connected to OVS-DPDK we should check the associated NUMA node: 

```
cat /sys/bus/pci/devices/0000:88:00.0/numa_node
1
cat /sys/bus/pci/devices/0000:88:00.1/numa_node
1
```

**As our NICs are associated with the NUMA node 1 we need to dedicate CPU cores in the same NUMA node to run PMD threads.** From the _lscpu_ command's output we know we should use CPU cores from range 10-19 or 30-39. 

### Configuring KVM machine



### Summary

This blog posts describes how to setup OVS-DPDK with VM for performance testing. I hope it will be found useful for anyone, who will need to run OVS-DPDK with KVM. With this setup I was able to achieve ~8.5 Mpps (~7.5 Gbps) for l2fwd on HP ProLiant DL380 Gen9 server with 2x Intel(R) Xeon(R) CPU E5-2650 v3 @ 2.30GHz and 128 GB RAM.

If you have any problem to reproduce the steps to configure OVS-DPDK with VM don't hesitate to contact me. 
