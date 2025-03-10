// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-landing",
    title: "landing",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-about",
          title: "about",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/about";
          },
        },{id: "nav-blog",
          title: "blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "nav-projects",
          title: "projects",
          description: "A growing collection of your cool projects.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "nav-repositories",
          title: "repositories",
          description: "Edit the `_data/repositories.yml` and change the `github_users` and `github_repos` lists to include your own GitHub profile and repositories.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/repositories/";
          },
        },{id: "nav-teaching",
          title: "teaching",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/teaching/";
          },
        },{id: "post-google-gemini-updates-flash-1-5-gemma-2-and-project-astra",
      
        title: 'Google Gemini updates: Flash 1.5, Gemma 2 and Project Astra <svg width="1.2rem" height="1.2rem" top=".5rem" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M17 13.5v6H5v-12h6m3-3h6v6m0-6-9 9" class="icon_svg-stroke" stroke="#999" stroke-width="1.5" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
      
      description: "We’re sharing updates across our Gemini family of models and a glimpse of Project Astra, our vision for the future of AI assistants.",
      section: "Posts",
      handler: () => {
        
          window.open("https://blog.google/technology/ai/google-gemini-update-flash-ai-assistant-io-2024/", "_blank");
        
      },
    },{id: "post-displaying-external-posts-on-your-al-folio-blog",
      
        title: 'Displaying External Posts on Your al-folio Blog <svg width="1.2rem" height="1.2rem" top=".5rem" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M17 13.5v6H5v-12h6m3-3h6v6m0-6-9 9" class="icon_svg-stroke" stroke="#999" stroke-width="1.5" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.open("https://medium.com/@al-folio/displaying-external-posts-on-your-al-folio-blog-b60a1d241a0a?source=rss-17feae71c3c4------2", "_blank");
        
      },
    },{id: "post-my-notes-from-podcast-quot-why-doesn-39-t-ovs-support-p4-quot",
      
        title: "My notes from podcast &quot;Why doesn&#39;t OVS support P4?&quot;",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2020/my-notes-from-podcast-why-doesn-t-ovs-support-p4/";
        
      },
    },{id: "post-p4c-ubpf-the-new-back-end-for-the-p4-compiler",
      
        title: "p4c-ubpf - the new back-end for the P4 compiler!",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2020/p4c-ubpf-the-new-back-end-for-the-p4-compiler/";
        
      },
    },{id: "post-my-takeways-from-the-quot-c-traps-and-pitfalls-quot-book",
      
        title: "My takeways from the &quot;C Traps and Pitfalls&quot; book",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2020/my-takeways-from-c-traps-and-pitfalls/";
        
      },
    },{id: "post-ovs-afxdp-step-by-step-installation-guide",
      
        title: "OVS_AFXDP - step-by-step installation guide",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2020/ovs-afxdp-installation/";
        
      },
    },{id: "post-implementing-tunneling-techniques-in-p4-based-on-the-example-of-vxlan",
      
        title: "Implementing tunneling techniques in P4 based on the example of VXLAN",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2019/vxlan-tunneling-in-p4/";
        
      },
    },{id: "post-configuring-ovs-dpdk-with-vm",
      
        title: "Configuring OVS-DPDK with VM",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2019/configuring-ovs-dpdk-with-vm/";
        
      },
    },{id: "post-mpls-network-based-on-p4",
      
        title: "MPLS network based on P4",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2019/mpls-p4/";
        
      },
    },{id: "post-ip-router-in-p4",
      
        title: "IP Router in P4",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2019/ip-router-p4/";
        
      },
    },{id: "post-network-prototyping-made-easy-with-p4-and-python",
      
        title: "Network prototyping made easy with P4 and Python!",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2018/network-prototyping-p4/";
        
      },
    },{id: "post-initial-view-on-vowifi-in-the-5g-network",
      
        title: "Initial view on VoWiFi in the 5G network",
      
      description: "A short overview of how the Voice over WiFi architecture may change in 5G deployments compared to 4G.",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2017/vowifi-5g/";
        
      },
    },{id: "post-explanation-of-ipsec-basics",
      
        title: "Explanation of IPSec basics",
      
      description: "An in-depth tutorial on IPSec based on Strongswan",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2017/ipsec-explanation/";
        
      },
    },{id: "books-the-godfather",
          title: 'The Godfather',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/the_godfather/";
            },},{id: "news-a-simple-inline-announcement",
          title: 'A simple inline announcement.',
          description: "",
          section: "News",},{id: "news-a-long-announcement-with-details",
          title: 'A long announcement with details',
          description: "",
          section: "News",handler: () => {
              window.location.href = "/news/announcement_2/";
            },},{id: "news-a-simple-inline-announcement-with-markdown-emoji-sparkles-smile",
          title: 'A simple inline announcement with Markdown emoji! :sparkles: :smile:',
          description: "",
          section: "News",},{id: "projects-start-by-foundation-for-polish-science",
          title: 'START by Foundation for Polish Science',
          description: "I have been recognized as one of TOP100 young researches in Poland and awarded with the START scholarship.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/1_FNP_START/";
            },},{id: "projects-pl-5g",
          title: 'PL-5G',
          description: "Building a national 5G research lab in Poland. I was responsible for building a programmable networks lab consisting of high-performance compute servers, P4-programmable Tofino-based EdgeCore Wedge switches, DPU/IPU cards and IXIA traffic generator.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/2_PL-5G/";
            },},{id: "projects-onf-aether",
          title: 'ONF Aether',
          description: "As a Member of ONF&#39;s Technical Staff I contributed to various components of the ONF Aether stack, mainly pfcpsim, BESS-UPF and P4-UPF.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/3_Aether/";
            },},{id: "projects-sd-fabric",
          title: 'SD-Fabric',
          description: "As a Member of ONF&#39;s Technical Staff I actively contributed to the SD-Fabric software stack (P4 programs for BMv2 and Tofino, ONOS core &amp; apps, line-rate &amp; packet-level tests, Host-INT)",
          section: "Projects",handler: () => {
              window.location.href = "/projects/4_SDFabric/";
            },},{id: "projects-p4",
          title: 'P4',
          description: "I&#39;m member of the P4 community. I was a speaker at several P4 conferences and contributed two backends for the P4 compiler (PSA-eBPF, P4-uBPF)",
          section: "Projects",handler: () => {
              window.location.href = "/projects/5_P4/";
            },},{id: "projects-onap",
          title: 'ONAP',
          description: "I was involved in the Change Management project. The objective was to provide lifecycle management APIs to support seamless software upgrade of Virtual Network Functions. For Casablanca release, I implemented a northbound APIs for Application Controller (APP-C) to support traffic distribution.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/6_ONAP/";
            },},{id: "projects-5g-pagoda-h2020-program",
          title: '5G!Pagoda H2020 program',
          description: "I contributed to the 5G!Pagoda EU-Japan project realized under EU H2020 programme. 5G!Pagoda was a research project on network slicing for 5G networks. I was involved in designing a network slicing architecture and multi-domain NFV orchestration. Moreover, I had developed various prototypes of designed solutions based on OpenStack, Docker, Kubernetes, OpenBaton, Ansible and Juju.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/7_PAGODA/";
            },},{id: "projects-floodlight",
          title: 'Floodlight',
          description: "I implemented a multipath routing algorithm based on the Depth-First Search (DFS) algorithm for the Floodlight SDN controller.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/8_Floodlight/";
            },},{id: "projects-onos",
          title: 'ONOS',
          description: "I have designed from scratch and developed the XMPP protocol as a southbound interface for Open Network Operating System (ONOS). The main use case for XMPP in ONOS was the BGP/MPLS IP VPN solution as described in IETF draft &quot;BGP-Signaled End-System IP/VPNs&quot;.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/9_XMPP-ONOS/";
            },},{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%6F%73%69%6E%73%74%6F%6D@%67%6D%61%69%6C.%63%6F%6D", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/osinstom", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/tomek-osinski", "_blank");
        },
      },{
        id: 'social-orcid',
        title: 'ORCID',
        section: 'Socials',
        handler: () => {
          window.open("https://orcid.org/0000-0001-6906-8722", "_blank");
        },
      },{
        id: 'social-scholar',
        title: 'Google Scholar',
        section: 'Socials',
        handler: () => {
          window.open("https://scholar.google.com/citations?user=vQmx0FQAAAAJ", "_blank");
        },
      },{
        id: 'social-x',
        title: 'X',
        section: 'Socials',
        handler: () => {
          window.open("https://twitter.com/tomek_osinski", "_blank");
        },
      },{
        id: 'social-custom_social',
        title: 'Custom_social',
        section: 'Socials',
        handler: () => {
          window.open("https://www.alberteinstein.com/", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
