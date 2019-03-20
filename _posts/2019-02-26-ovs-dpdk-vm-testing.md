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

If Ethernet interfaces have been bound to DPDK, it's time to mount hugepages. In order to allocate hugepages persistently I have added following parameters to GRUB_CMDLINE_LINUX_DEFAULT in _/etc/default/grub_:

`GRUB_CMDLINE_LINUX_DEFAULT="default_hugepagesz=1G hugepagesz=1G hugepages=16 hugepagesz=2M hugepages=2048"`

Then, upgrade grub and reboot a machine:

```
sudo update-grub
sudo reboot
```

After restart, mount hugepages and check if they are allocated:

```
sudo mkdir -p /mnt/huge
sudo mount -t hugetlbfs nodev /mnt/huge

```

And edit configuration to support 2048 hugepages. 

`sudo nano /sys/devices/system/node/node0/hugepages/hugepages-2048kB/nr_hugepages`

and set number of hugepages to _2048_.

You can validate if hugepages has been configured by:

`grep -i huge /proc/meminfo`

### Performance tuning of OVS-DPDK

### Configuring KVM machine



### Summary

This blog posts describes how to setup OVS-DPDK with VM for performance testing. I hope it will be found useful for anyone, who will need to run OVS-DPDK with KVM. With this setup I was able to achieve ~8.5 Mpps (~7.5 Gbps) for l2fwd on HP ProLiant DL380 Gen9 server with 2x Intel(R) Xeon(R) CPU E5-2650 v3 @ 2.30GHz and 128 GB RAM.


