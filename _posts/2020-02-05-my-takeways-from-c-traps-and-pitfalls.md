---
layout: post
title: My takeways from the "C Traps and Pitfalls" book
date: 2020-02-05
tags: C programming
categories: article
toc:
  beginning: true
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
1. In this example, both comparisons produce the value of 0 or 1, so that `&` and `&&` will work similarily. However, if one of the comparisons would produce some other value, the loop would work incorrectly.
2. This is really tricky and can make a surprise! The `&`, unlike `&&`, must **always** evaluate both of its operands. So, even if `i < tabsize` is "False", the second operand (`tab[i] != x`) will be evaluated! In this case, it leads to reading a value that is not in the bounds of the `tab` array.

It is worth to remember these consequences as the recruiters like to ask this sort of questions at job interview :)

### 6. C doesn't cast function's arguments automatically!

In other words:

> It is the programmer’s responsibility to ensure that the arguments toa function are of the right type.

### 7. Allocate enough memory for strings

String is an array of characters, but this array is terminated with `'\0'` (null character). Therefore, we need allocate one extra character for string! For example, if `strlen(s)` equals `n`, `s` really requires `n+1` characters to be allocated.

### 8. Integer overflow

> If either operand is unsigned, the result is unsigned, and is defined to be modulo 2^n, where "n" is  the word size.  If both operands are signed, the result is **undefined**.

### 9. How to shift bits?

1. It is more safe to right-shift *unsigned* integers. In some implementations, if the item is *signed*, it is allowed to fill vacatated bit positions either with zeros or with copies of the sign bit. The latter can make a surprise!

2. It is not allowed to shift the variable by value greater than its length.

### 10. What C preprocessor gives us?

1. We can change all instances of a particular quantity by changing one number (in only one place) and recompiling the program. It is useful for some pre-defined variables like size of char arrays etc.
2. We can define things to appear as functions, but without typical execution overhead, which applies to classical function calls. Preprocessor just replaces a function call inline with predefined operations defined in macros.

### 11. Macros are not functions

This statements is rather obvious for everyone, who has been working with C for some time now. However, it can be misunderstood by beginners.

Even though macros usually looks like function calls, they are not the same! Come back to takeways #10 and remember: preprocessor replaces all macros instances with actual value of a macro. This may lead to surprises for less experienced programmers.

In my personal opinion, macros should be used mindfully, because they are not always the best option. The macros imitating functions sometimes looks really ugly and far away from "clean code" principles. My hint?

> Use macros to imitate function only if a function is not complex. Otherwise, use typical functions to make a code more readable.

### 12. Macros are not typedefs

In C, there is a construct called *typedef*, which allows programmer to create new types. However, macros are also used to define new types. The rule to remember is that macros are not typedefs and can lead to a surprise. Consider below example (from book):

```C
// T1 and T2 conceptually seems to define the same type (pointer to a struct foo).
#define T1 struct foo *
typedef struct foo *T2;

// declarations
T1 a, b;
T2 c, d;
```

Now, there is a surprise! Remember macros replaces its instances with the actual value. As a result we have:

```C
struct foo * a, b;
```

So, "a" is a pointer to a struct foo, indeed. However, "b" is just a variable of type struct foo!

### 13. C is not really portable

The chapter 7 of the book deals with portability pitfalls. To summarize this chapter it is really easy to say that C is not really portable language and every programmer needs to know, which platform she or he is programming on. A programmer has to know about underlaying platform's features, libraries and limitations.

What authors recommend to look at regarding portability?
* Case sensitivness - not all platforms/compilers are sensitive to case in names of variables/functions.
* Size of integers - the size is architecture-dependent. Usually we have 32 bit for integers, 16 bit for *short*, etc. However, it is not guaranteed.
* Converting char to int - it is not defined if a character should be transformed to unsigned or signed integer. If one wants to force conversion to unsigned integer it is better to declare *unsigned char*. In this case, extra bit positions should be filled with zeros. If casting from *char* it depends on implementation - a compiler may convert it to signed or unsigned integer.
* Random numbers - due to historical reasons, it is undefined what is an upper bound for randomly-generated number. However, it is granted to be at least 2^15-1.

## Summary

This book was a nice journey for me! As I spent a lot of time on programming C software during last year, it was not a revolutionary book for me. Nevertheless, it definetely expand my knowledge about C and I'm sure it provides a strong background and deep knowledge about specific constructs of C.