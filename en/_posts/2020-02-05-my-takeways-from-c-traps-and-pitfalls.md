---
date: '2020-02-05 08:38 +0100'
layout: single
published: false
title: My takeways from "C Traps and Pitfalls"
categories:
  - tutorial
tags:
  - C
  - programming
  - C operators
---

Recently, I read the really nice book, entitled "C Traps and Pitfalls", to extend my competences in C. This post gathers all my findings and takeways from this book. I wrote this more for myself to note the key findings, but I think any C programmer can find something useful in my notes. Enjoy!

### 1. Precendence of operators

Before going into the topic, quick reminder on what operators do we have in C:

* **Arithmetic operators** - math operators such as `+`, `-`, `*`, `/`, `%`
* **Increment and decrement operators** - two operators (`++` and `--`) to change the value of an operand by one.
* **Assignment operators** - for assigning the value to a variable: `=`, `+=`, `-=`, `*=`, `/=`, `%=`. 
* **Relational operators** - used in decision making or loops to check the relationship between two operands: `==`, `>`, `<`, `!=`, `>=`, `<=`.
* **Logical operators** - to perform logical operations: `&&` (AND), `||` (OR), `!` (NOT)
* **Bitwise operators** - to perform operation on bits: `&`, `|`, `^`, `~`, `<<`, `>>`.

Except for above, there are two simple operators: sizeof and Comma operator.

Now, where does the precendence of operators matter? In general, in any statement of the C program, but we would meet the most surprising traps in the *if* statements. According to the example from book, we could write the following statement to check if variable `flags` has some bit (represented as `FLAG`) turned on:

```C
if (flags & FLAG != 0) ...
```

Sic! The relational operator  (`!=`) has the precendence over the bitwise operator (`&`), so it totally changes our intention! 

To conclude this paragraph, the operator's precendence in C can make a lot of surprises for not experienced programmer. My tip? Use as much parenthesess as you need, but not more than really required, in the *if* statements to express your intention. You will avoid a lot of surprises this way. 



