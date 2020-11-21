---
date: '2020-11-21 22:14 +0100'
layout: single
published: false
title: Understanding the P4's Action Profile/Selector
---

# Introduction

In this post I explain how Action Selector works based on the implementation of the IP-based load balancing.

# Demo

# When is Action Selector useful? 

Think about Action Selector any time you need different flavors (action parameters) of an action for a given match key(s). In other words, use Action Selector when, for a given packet, you want to dynamically select an action from a pre-defined set. 

In practice, this functionality is very useful, when implementing different kinds of traffic distrubution at the data plane level: LAG, ECMP, load balancing, etc.