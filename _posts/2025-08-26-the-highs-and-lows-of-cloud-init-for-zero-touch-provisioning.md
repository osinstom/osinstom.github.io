---
layout: post
title: The Highs and Lows of cloud-init for Zero-Touch Provisioning
description: What held up, and what did not, after we moved Day-0 OS configuration for zero-touch edge provisioning onto cloud-init.
date: 2025-08-26
tags:
  - cloud-init
  - edge
  - zero-touch provisioning
categories: article
toc:
  sidebar: left
---

NOTE: This blog post was originally published on Medium: https://medium.com/@osinstom/the-highs-and-lows-of-cloud-init-for-zero-touch-provisioning-7da5f4154e1b.

As part of the previous release of Edge Manageability Framework (Intel’s Open Edge Platform) I’ve led significant migration towards using **cloud-init** for initial OS configuration during [Zero-Touch Provisioning](https://medium.com/@osinstom/zero-touch-provisioning-with-open-edge-platform-b02ab7ba8da3) (ZTP). This journey gave me some experience on pros and cons of cloud-init — in particular, in resource-constrained edge deployments with flaky network connectivity — that I would like to share in this blog post.

## Before and After

Before diving into lessons learned, let me briefly explain why we decided to migrate to cloud-init.

In the Open Edge Platform, every provisioned Edge Node is supplemented with additional scripts, environment files and services — all needed to successfully connect Edge Nodes to the Edge Manageability Framework.

Previously, we relied on a custom Bash script that has been injected as a one-shot systemd service via a Tinkerbell action (see more on implementations details of the provisioning subystem in the [official docs](https://docs.openedgeplatform.intel.com/edge-manage-docs/dev/developer_guide/infra_manager/arch/provisioning.html)). The role of the script was to provide OS configuration, but it quickly got overloaded, became unreadable and, most importantly, not really portable among different OSes. For example, TLS certificates must be written to different OS paths, depending on the OS distro.

Here comes [cloud-init](https://docs.cloud-init.io/en/latest/index.html).. cloud-init is a well-known, industry-standard tool for VM (Virtual Machines) provisioning in cloud environments. However, since it’s not tightened only to virtual appliances, it can be easily used for bare-metal provisioning as well. We decided to migrate all common OS configuration from the custom Bash script to the cloud-init configuration. Why? Because cloud-init uses a declarative configuration model, which abstracts away OS-specific details. This shift significantly improved portability and maintainability.

As a result, Edge Manageability Framework could support additional OS distributions without any modifications to OS configuration mechanism — thanks to the usage of cloud-init. Moreover, the cloud-init support became a foundation for the [custom config](https://docs.openedgeplatform.intel.com/edge-manage-docs/dev/user_guide/advanced_functionality/custom_config.html) — a user-defined cloud-init configuration that is applied on top of the default cloud-init during the Day0 provisioning. The custom config has been released in EMF v3.1 and provides users with a way to further customize Edge Nodes and re-purpose them for any specific business needs.

## 🌟 The Highs: Why cloud-init Shines

Now, let me summarize the pros of cloud-init in the context of edge deployments.

### 1. OS-agnostic Configuration

cloud-init is natively supported by major OSes like Ubuntu, Centos, etc. This makes it ideal for highly fragmented market such as the edge business, where customers may want to run their workloads on various OSes, ensuring consistent provisioning across environments.

### 2. Declarative Configuration

Using YAML-based configuration files, cloud-init allows users to define instance behavior in a clear, readable format. This declarative approach makes OS configuration more concise (important where network connection speed is low and cloud-init configuration must be transferred over the network), abstracts away low-level OS details, streamlines provisioning, and significantly reduces the risk of manual errors.

### 3. Industry Standard

cloud-init is widely recognized and adopted across major cloud platforms and Linux distributions. Its maturity and community support make it a reliable choice for edge deployments, reducing the risk of vendor lock-in and ensuring long-term maintainability. The cloud-init format is also well-known to most IT people — it makes things easier for external users that want to customize their Edge Nodes.

### 4. Modular and Extensible

Cloud-init is composed of modules that handle specific tasks — like setting up SSH keys, configuring network interfaces, or installing packages. This modularity allows for fine-grained control and easy customization.

### 5. First-Boot and Fast Execution

cloud-init runs during the first boot of an instance, making it ideal for ZTP. It ensures that machines are configured correctly before they become operational, minimizing manual intervention. Moreover — since cloud-init is executed during the kernel boot — the OS configuration is provisioned faster, compared to our previous approach leveraging post-boot systemd service.

## ⚠️ The Lows: Where cloud-init Falls Short

Based on my experience with cloud-init there are some quirks that everyone attempting to use cloud-init should be aware of and careful about. Good news — most of them can be easily mitigated, so look at the next section!

### 1. Limited Error Handling

God save you when something goes wrong during OS provisioning! cloud-init lacks robust error handling mechanisms. If a script or module fails, cloud-init typically fails silently and it won’t retry or gracefully recover, potentially leaving the instance in a broken state.

### 2. Limited resilience

cloud-init is not resilient to temporary disruptions or network connectivity losses. It basically executes everything in order, without any retry on failures. This can be particularly dangerous in edge deployments where the network connectivity is not always given and may disappear randomly.

### 3. Debugging Can Be Tricky

When cloud-init fails, it can be hard to pinpoint the issue. Logs are scattered across multiple files (/var/log/cloud-init.log, /var/log/cloud-init-output.log, etc.), and error messages are not always descriptive.

### 4. Inconsistent Behavior Across Platforms

Despite broad support, some cloud-init modules can behave differently depending on the cloud provider or OS image. This inconsistency can lead to unexpected results and complicate cross-platform deployments.

> I know it may conflict a bit with the “OS-agnostic Configuration” which I marked as an advantage. To clarify, cloud-init is OS-agnostic by design and the declarative format of cloud-init is indeed portable. Moreover, most of cloud-init modules behave consistently across OS distributions. However, some cloud-init modules are based on policies (e.g., how to merge files, etc.) — these policies may sometimes differ depending on the OS. That’s why it’s extremely important to carefully validate all possible edge deployments.

### 5. Security Considerations

Embedding sensitive data (like passwords or API keys) directly into cloud-init scripts is risky. While there are ways to mitigate this (e.g., using secrets managers), it adds complexity to the provisioning process.

### 6. Package Size

cloud-init is written in Python, so it requires the Python environment to be part of the OS image and the cloud-init Python module takes a larger portion of disk space than compiled binaries (typically takes around 80MB of space). Thus, it increases the final size of the OS image used for Edge Nodes, what can be problematic for resource-constrained edge deployments. Unfortunately, there is no easy solution to this problem and would require a complete re-write of cloud-init. There are some alternatives such as [clr-cloud-init](https://www.clearlinux.org/node/666.html), but it may not be mature and feature-complete enough.

## 🧠 Best Practices for Using cloud-init in Distributed Edge Deployments

Over time, we’ve shaped a few simple principles to make cloud-init OS configuration process robust.

### 1. Use built-in cloud-init modules for static configuration only

Number #1 rule is to avoid executing any tasks requiring network connectivity with native cloud-init mechanisms. For example, we extract OS packages installation (or any tasks that may easily fail due to lack of network connectivity) to a systemd service that can be retried on failure. In result, cloud-init is only used for OS configuration that is very unlikely to fail, such as writing environment files, firewall rules, certificates or static files.

### 2. Thorough testing & validation across OS platforms

Cliché, but worth emphasising. Inconsistent behavior across platforms and OS configuration errors can be eliminated, if cloud-init scripts are thoroughly validated across all supported OS distributions.

### 3. Wherever possible, use built-in cloud-init modules

Apart from exceptions from #1 rule, we use built-in cloud-init modules to configure OS, mainly because built-in cloud-init modules are portable across OSes and take less space as they are declarative.

### 4. Ensure credentials are encrypted

To address security considerations, make sure your security credentials are encrypted or hashed. For example, [cloud-init provides a way to hash user passwords instead of storing them as plain text](https://docs.cloud-init.io/en/latest/reference/modules.html#set-passwords).

## Summary

**Cloud-init is a powerful tool for automating OS configuration — but with great power comes great responsibility.**

In edge deployments, where reliability is critical, using cloud-init can introduce unique challenges because it wasn’t originally designed for these environments.

In this post, I share key lessons learned from adopting cloud-init as the OS configuration engine for **Zero Touch Provisioning (ZTP)** within the **Edge Manageability Framework**. These insights can help you build more robust, fault-tolerant mechanisms for edge scenarios.

I’d love to hear your thoughts and experiences — how are you tackling configuration at the edge?

Thanks for reading!
