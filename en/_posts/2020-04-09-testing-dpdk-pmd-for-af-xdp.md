---
date: '2020-04-09 12:34 +0200'
layout: single
published: false
title: Testing DPDK PMD for AF_XDP
---

In this post I share my experience with DPDK PMD for AF_XDP. AF_XDP is a new type of socket, which allows to pass packets from the NIC driver directly to the userspace (kernel bypass). The design and implementation of DPDK PMD for AF_XDP can be found in the [presentation from DPDK Summit 2019](https://www.dpdk.org/wp-content/uploads/sites/35/2019/07/14-AF_XDP-dpdk-summit-china-2019.pdf).

My intention was to just play with DPDK PMD for AF_XDP. This blog post summarizes my experiments.

# Preparation

What I did before starting to test DPDK PMD for AF_XDP is to:

1. Install the new kernel (v5.4.12) supporting newest AF_XDP. The official DPDK documentation says that at least the following Linux features must be supported by OS: 
  * need_wakeup feature
  * PMD zero copy
Both these features comes with kernel v5.4.12.
2. Install `libbpf`. It is required to run AF_XDP sockets. I've installed Linux 5.4.12 from source, so the easiest way was to enter <kernel-source>/tools/lib/bpf and execute:
  
  ```
  sudo make install_lib
  sudo make install_headers
  ```
  
3. Install DPDK library (v20.02). 
  
  ```bash
  # Download latest DPDK release (20.02):
  wget https://fast.dpdk.org/rel/dpdk-20.02.tar.xz
  tar xJf dpdk-20.02.tar.xz
  cd dpdk-20.02/
  # Important! The option below must be configured in config/common_linux
  CONFIG_RTE_LIBRTE_PMD_AF_XDP=y
  make -j $(n_cores) install T=x86_64-native-linuxapp-gcc
  # Involve libbpf. Replace <PATH-TO-LINUX-SRC>.
  export LD_LIBRARY_PATH=<PATH-TO-LINUX-SRC>/tools/lib/bpf:$LD_LIBRARY_PATH
  ```

4. Configure test interfaces to work with AF_XDP:
  
  ```
  sudo ethtool -L ens1f0 combined 1
  sudo ethtool -L ens1f1 combined 1
  ```
5. Mount hugepages:
  
  ```
  mkdir -p /mnt/huge
  echo 1024 > /sys/devices/system/node/node0/hugepages/hugepages-2048kB/nr_hugepages
  mount -t hugetlbfs nodev /mnt/huge
  ```
  
# Basic performance tests


Basically, my first try was to just run the `testpmd` application with DPDK PMD for AF_XDP. It worked like a charm! 

```
sudo ./x86_64-native-linuxapp-gcc/app/testpmd -l 1-2 -n 4 --vdev net_af_xdp0,iface=ens1f0,start_queue=0,queue_count=1 --log-level=pmd.net.af_xdp:8  -- -i --nb-cores=1 --rxq=1 --txq=1 --port-topology=loop
```
  
If you see the following message you should be happy:
  
```
rte_pmd_af_xdp_probe(): Initializing pmd_af_xdp for net_af_xdp0
```
  
Ok, if it works, let's make some performance tests. I've connected two 10G ports of IXIA hardware generator to my Dell server. Then, I've run the `testpmd` application handling packets on two 10G ports:
  
```
./x86_64-native-linuxapp-gcc/app/testpmd -l 1-3 --no-pci -n 4 \
--vdev net_af_xdp0,iface=ens1f0 --vdev net_af_xdp1,iface=ens1f1 \
--log-level=pmd.net.af_xdp:8 -- -i --auto-start --nb-cores=2 --rxq=1 --txq=1
```
  
Download the `set_irq_affinity.sh` script...

```
wget https://gist.githubusercontent.com/syuu1228/4352382/raw/5dc7abe2968088310fc05abf6f7cc25847151104/set_irq_affinity.sh
```
  
And assigned kernel cores:
  
```
./set_irq_affinity 4 ens1f0
./set_irq_affinity 5 ens1f1
```

## Comparison with OVS-AF_XDP

# Running DPDK PMD for AF_XDP in Docker

# Summary

Let me provide a few bullets providing summary of this blog post:

* The support for AF_XDP-based DPDK PMD has been added in DPDK 19.05 (https://doc.dpdk.org/guides/rel_notes/release_19_05.html)
