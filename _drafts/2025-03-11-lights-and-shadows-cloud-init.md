
## Lights and Shadows of cloud-init

cloud-init has been used for years as an industry standard to provide OS-level configuration. It originally came from the virtualization world where it's extensively used to inject runtime configuration (e.g., default users, SSH keys, etc.) to virtual machines. Recently, it has also gained more adoptions from Bare Metal as a Service systems (like Tinkerbell). 

I've recently spent a lot of time working on cloud-init. Since I've got strong experience in cloud-init, I thought it would be worth sharing my findings about pros and cons of cloud-init. 

### Lights 

- OS portability
- 

### Shadows

- Weak documentation
- Hard debugging
- No retry mechanism - god save you if something fails with cloud-int 

### Best practices

1. Use cloud-init for static configuration only - 

2. Prefer local cloud-init for unreliable and flaky network connections

### Are there alternatives? 

Ignition 

