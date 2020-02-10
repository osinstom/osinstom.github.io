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

Recently, I read the really nice book, entitled "C Traps and Pitfalls", to extend my competences in C. This post gathers all my key findings and takeways from this book. I wrote this more for myself to note the key findings, but I think any C programmer can find something useful in my notes. Enjoy!

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

Sic! The relational operator  (`!=`) has the precendence over the bitwise operator (`&`), so it totally changes our intention! The statement firstly compare `FLAG` with 0 and, then, takes the result of comparison and performs logical AND operation with flags. This was not our intention! 

In the book, there are more examples of such a traps in C. What we should remember is:

> The precendence of operators in C is as follows (from the highest precendence):
The arithmetic operators, the shift operators, the relational operators, the logical operators, the assignment operators, the conditional operator.

To conclude this paragraph, the operator's precendence in C can make a lot of surprises for not experienced programmer. 

> My hint? Use as much parenthesess as you need, but not more than really required, in the *if* statements to express your intention. You will avoid a lot of surprises this way.

### 2. Mind a break statement!

In the *switch* statement each *case* statement should be terminated with *break*. Otherwise, all the subsequent *case* statements will be also invoked until the first *break* ! Note that this trap may also be a nice feature of the language if used intentionally (e.g. in the compiler program to skip some tokens while analyzing the code). 

### 3. Dangling *else* problem

Consider the following example from the book:

```C
if (x == 0)
  if (y == 0) error();
else {
  z = x + y;
  f(&z);
}
```

The intention here is to enter *else* block if `x != 0`. However, in C, *else* is associated with the nearest *if* statement! Therefore, in the above example *else* statement will be invoked if `y != 0` (sic!). 

> My hint? You should always use parenthesses in the *if-else* statements to make sure that C program behaves as you intended to.

### 4. Order of evaluation

Order of evaluation for most operators in the C language is not defined. The compiler is free to evaluate such expressions in any order, if the compiler can guarantee a consistent results.

The only the following operators specify and guarantee the particular order of evalation: sequential-evaluation (`,`), logical-AND (`&&`), logical-OR (`||`) and conditional expression (`? :`). 

All other C operands evalute their operands in undefined order. It means their exact behavior is implementation-specific/

### 5. Logical vs. bitwise comparison

Anyone should avoid using logical (e.g. `&&`) and bitwise (`&`) operators, interchangebly. For experienced programmers, it is obvious that these operators are not equivalent to each other. However, young programmers can substitute bitwise operator for logical operators or vice versa. 

In general the rule is simple: 

> Logical operators treats their arguments as either "True" (value 1) or "False" (value 0). On the other hand, bitwise operators work on sequence of bits and compares bits of their arguments. 

According to the following example (from book):

```C
i = 0;
while (i < tabsize && tab[i] != x)
  i++;
```

If the `&&` would be replaced by `&` we will have two consequences:
1. 









