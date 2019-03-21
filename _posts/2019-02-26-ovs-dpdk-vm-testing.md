---
layout: single
published: false
date: '[object Object]'
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

Recently, I work on a performance comparison between virtualization technologies. In order to make an evaluation I had to setup a test environment based on [OVS-DPDK](https://software.intel.com/en-us/articles/open-vswitch-with-dpdk-overview) and [KVM-based Virtual Machine](https://www.redhat.com/en/topics/virtualization/what-is-KVM). This user guide shows how to install and configure the test scenario with OVS-DPDK and libvirt. The test scenario is presented below. According to OVS flow rules configuration we can test PHY-OVS-PHY scenario (green line) or PHY-VM-PHY scenario (red line). 

![The OVS-DPDK + VM scenario]({{site.baseurl}}/_posts/test-scenario-ovs-dpdk.png)


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

**As our NICs are associated with the NUMA node 1 we need to dedicate CPU cores in the same NUMA node to run PMD threads.** From the _lscpu_ command's output we know we should use CPU cores from range 10-19 or 30-39. So, let's configure remaining parameters (we don't configure _pmd-rxq-affinity_):

```
sudo ovs-vsctl --no-wait set Open_vSwitch . other_config:dpdk-lcore-mask=""
sudo ovs-vsctl --no-wait set Open_vSwitch . other_config:pmd-cpu-mask=""
```

When DPDK parameters are configured, let's run OVS-DPDK bridge. To create OVS-DPDK bridge with type=netdev use:

```
sudo ovs-vsctl add-br br0
sudo ovs-vsctl set Bridge br0 datapath_type=netdev
```

And add physical ports to OVS-DPDK:

```
sudo ovs-vsctl add-port br0 ens4f0 -- set Interface ens4f0 type=dpdk \
            options:dpdk-devargs=0000:88:00.0 \
            options:n_rxq=2 \
            ofport_request=1

sudo ovs-vsctl add-port br0 ens4f1 -- set Interface ens4f1 type=dpdk \
            options:dpdk-devargs=0000:88:00.1 \
            options:n_rxq=2 \
            ofport_request=2
```

In our case we want also to attach VM to OVS-DPDK, so we create two virtual ports (type=dpdkvhostuser). These ports will be later used by VM.

```
sudo ovs-vsctl add-port br0 dpdkvhostuser0 -- set Interface dpdkvhostuser0 type=dpdkvhostuser ofport_request=3

sudo ovs-vsctl add-port br0 dpdkvhostuser1 -- set Interface dpdkvhostuser1 type=dpdkvhostuser ofport_request=4
```

Then, let's configure the OVS flow fules to push traffic to and from VM's ports.

```
sudo ovs-ofctl del-flows br0
sudo ovs-ofctl add-flow br0 in_port=1,actions=output:3
sudo ovs-ofctl add-flow br0 in_port=2,actions=output:4
sudo ovs-ofctl add-flow br0 in_port=3,actions=output:1
sudo ovs-ofctl add-flow br0 in_port=4,actions=output:2
```

To check current configuration of OVS use:

```
sudo ovs-ofctl dump-flows br0
sudo ovs-ofctl dump-ports br0
sudo ovs-vsctl show
```

Great! We have OVS-DPDK up and running. Now, let's create and run Virtual Machine..

### Configuring KVM machine

In order to configure and run VMs we will use _virsh_. Before booting the VM up we need to prepare Host OS by configuring permissions for QEMU and hugepages to be used by VM's ports.

Edit /etc/libvirt/qemu.conf and modify the following lines to set "root" as the value of user and group:

```
user = "root"
group = "root"
```

Then, restart libvirt:

`sudo systemctl restart libvirtd.service`

Now, mount hugepages to be used by QEMU:

```
sudo mkdir -p /dev/hugepages/libvirt
sudo mkdir -p /dev/hugepages/libvirt/qemu
sudo mount -t hugetlbfs hugetlbfs /dev/hugepages/libvirt/qemu
```

Once done, we can run VM by using _virsh_ and XML configuration file. The XML file is provided below. 

```xml
<domain type='kvm'>
  <name>demovm</name>
  <uuid>4a9b3f53-fa2a-47f3-a757-dd87720d9d1d</uuid>
  <memory unit='KiB'>8388608</memory>
  <currentMemory unit='KiB'>8399608</currentMemory>
  <memoryBacking>
    <hugepages>
      <page size='1' unit='G' nodeset='0'/>
    </hugepages>
  </memoryBacking>
  <vcpu placement='static'>8</vcpu>
  <cputune>
    <shares>4096</shares>
    <vcpupin vcpu='0' cpuset='14'/>
    <vcpupin vcpu='1' cpuset='15'/>
    <emulatorpin cpuset='11,13'/>
  </cputune>
  <os>
    <type arch='x86_64' machine='pc'>hvm</type>
    <boot dev='hd'/>
  </os>
  <features>
    <acpi/>
    <apic/>
  </features>
  <cpu mode='host-model'>
    <model fallback='allow'/>
    <topology sockets='2' cores='4' threads='1'/>
    <numa>
      <cell id='0' cpus='0-1' memory='4194304' unit='KiB' memAccess='shared'/>
    </numa>
  </cpu>
  <on_poweroff>destroy</on_poweroff>
  <on_reboot>restart</on_reboot>
  <on_crash>destroy</on_crash>
  <devices>
    <emulator>/usr/bin/qemu-system-x86_64</emulator>
    <disk type='file' device='disk'>
      <driver name='qemu' type='qcow2' cache='none'/>
      <source file='/home/tomek/ovs.qcow2'/>
      <target dev='vda' bus='virtio'/>
    </disk>
    <disk type='file' device='disk'>
      <source file='/home/tomek/user-data.img'/>
      <target dev='vdb' bus='virtio'/>
    </disk>
    <interface type='vhostuser'>
      <mac address='00:00:00:00:00:01'/>
      <source type='unix' path='/usr/local/var/run/openvswitch/dpdkvhostuser0' mode='client'/>
       <model type='virtio'/>
      <driver queues='2'>
        <host mrg_rxbuf='off'/>
      </driver>
    </interface>
    <interface type='vhostuser'>
      <mac address='00:00:00:00:00:02'/>
      <source type='unix' path='/usr/local/var/run/openvswitch/dpdkvhostuser1' mode='client'/>
      <model type='virtio'/>
      <driver queues='2'>
        <host mrg_rxbuf='off'/>
      </driver>
    </interface>
    <serial type='pty'>
      <target port='0'/>
    </serial>
    <console type='pty'>
      <target type='serial' port='0'/>
    </console>
  </devices>
</domain>
```

### Summary

This blog posts describes how to setup OVS-DPDK with VM for performance testing. I hope it will be found useful for anyone, who will need to run OVS-DPDK with KVM. With this setup I was able to achieve ~8.5 Mpps (~7.5 Gbps) for l2fwd on HP ProLiant DL380 Gen9 server with 2x Intel(R) Xeon(R) CPU E5-2650 v3 @ 2.30GHz and 128 GB RAM.

If you have any problem to reproduce the steps to configure OVS-DPDK with VM don't hesitate to contact me.
