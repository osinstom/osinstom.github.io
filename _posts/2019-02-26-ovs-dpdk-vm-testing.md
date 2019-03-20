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
title: Untitled
---
## Configuring OVS-DPDK with VM for performance testing

Recently, I work on a performance comparison between virtualization technologies. In order to make an evaluation I had to setup a test environment based on OVS-DPDK and KVM-based Virtual Machine (refer to test scenario below). This user guide shows how to install and configure the PHY-VM-PHY scenario with OVS-DPDK and libvirt.

// TODO: 

### Prerequisites



### Installing OVS-DPDK

Before starting installation, let's prepare OS.

```
sudo apt-get update
sudo apt-get upgrade

sudo apt-get -y install git python-pip fuse libfuse-dev dh-autoreconf openssl libssl-dev cmake libpcap-dev python-yaml libnuma-dev
```

Firstly, we need to install DPDK and Open vSwitch from a source code. To install DPDK:

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

.. and install DPDK:

`make install T=$DPDK_TARGET DESTDIR=install`

When the installation of DPDK has been successful, you can install OVS:

```
cd $HOME/dpdk/
git clone https://github.com/openvswitch/ovs
cd ovs
./boot.sh
./configure --with-dpdk=$DPDK_BUILD CFLAGS="-g -O2 -Wno-cast-align"
make
sudo make install
```

### Configuring OVS-DPDK

Firstly, let's configure DPDK ports. Following commands inject required kernel drivers (i.e. uio, igb_uio):

```
cd dpdk/dpdk-18.11/usertools/
sudo modprobe uio
sudo insmod x86_64-native-linuxapp-gcc/kmod/rte_kni.ko "lo_mode=lo_mode_ring"
sudo insmod x86_64-native-linuxapp-gcc/kmod/igb_uio.ko
```

If kernel modules has been injected NICs can be attached to DPDK. Note that you need to use the *bus-info* format (e.g.0000:88:00.0). 

```bash
sudo ./dpdk-devbind.py -b igb_uio 0000:88:00.0
sudo ./dpdk-devbind.py -b igb_uio 0000:88:00.1
```

Then, mount hugepages:

```
sudo mkdir -p /mnt/huge
(mount | grep hugetlbfs) > /dev/null || sudo mount -t hugetlbfs nodev /mnt/huge
```

And edit configuration to support 2048 hugepages. 

`sudo nano /sys/devices/system/node/node0/hugepages/hugepages-2048kB/nr_hugepages`

and set number of hugepages to _2048_.

You can validate if hugepages has been configured by:

`grep -i huge /proc/meminfo`

### Performance tuning of OVS-DPDK

### Configuring KVM machine



### Summary




