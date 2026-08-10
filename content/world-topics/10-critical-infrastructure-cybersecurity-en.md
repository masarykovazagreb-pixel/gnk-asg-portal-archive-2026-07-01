# The Invisible Battlefield: Cybersecurity of Critical Infrastructure

## Introduction

Modern civilization depends on a network of infrastructure systems — power grids, water supply, financial systems, healthcare institutions, and transportation infrastructure — that have become increasingly digitized and interconnected over prior decades, bringing significant efficiency gains, but simultaneously creating a new category of vulnerability that didn't exist when these systems were physically isolated and analog.

![Trend in Critical Infrastructure Cyber Incidents](chart10_cyber.png)
*Chart 10: Reported security incidents in critical infrastructure grew 668% since 2022 (Forescout 2024 Threat Roundup, citing the European Repository of Cyber Incidents). Critical infrastructure accounted for roughly 70% of all global attacks in 2023 (IBM X-Force), with a 30% rise in attack volume (420+ million attacks) between January 2023 and January 2024.*

## From Isolated Systems to Connected Vulnerability

Industrial control systems managing critical infrastructure — from power plants and water pumping stations to manufacturing facilities and traffic signaling — were designed during decades when cybersecurity was an irrelevant concern, simply because these systems were physically isolated from external networks. Gradual digitization and connection of these systems to corporate networks and, ultimately, the internet, for easier remote monitoring and management, opened these systems to threats their original designers never anticipated or planned to defend against.

This vulnerability becomes particularly acute because many of these systems are designed for a lifespan of decades, considerably longer than the typical upgrade cycle in standard information technology. The result is infrastructure often running outdated software no longer receiving security patches, embedded within systems that are today considerably more connected and exposed than their original designers ever anticipated.

## State Actors as the Dominant Threat

Unlike cybercrime aimed at financial gain, attacks on critical infrastructure increasingly involve state actors conducting or preparing capabilities for operations that could disable adversary infrastructure during open conflict. This dynamic creates a new category of military preparation unfolding quietly, continuously, during periods of formal peace, through infiltration and vulnerability mapping in adversary countries' infrastructure systems.

Detecting such infiltrations presents a unique challenge precisely because their purpose is often long-term preparation rather than immediate damage — an attacker who successfully infiltrates a power grid may take no visible action for years, simply maintaining presence and capability for future use should the geopolitical situation deteriorate into open conflict. This "prepositioning" strategy makes defense considerably harder than defense against traditional cybercrime, which usually seeks quick, visible financial gain.

## The Vulnerability of Connected Supply Chains

Critical infrastructure security depends not only on individual organizations' security but also on the security of the entire chain of software and equipment suppliers those organizations use. An attack on a single software vendor used across thousands of organizations can simultaneously compromise all those organizations, creating a scale of damage far exceeding what an attacker could achieve through a direct attack on an individual target.

This supply-chain dynamic creates a complex risk-management challenge for organizations that must assess not only their own security posture but also the security practices of every software and equipment vendor in their own supply chain — a task that becomes exponentially more complex as the number of digital vendors and integrations grows within a typical modern organization.

## The Convergence of Physical and Digital Security

The growing connection of operational technology, which directly controls physical processes like water flow or electricity distribution, with traditional information technology creates a new category of risk in which a cyberattack can have direct, physical real-world consequences, instead of remaining limited to data loss or theft. An attack that successfully manipulates an industrial control system could theoretically cause physical damage to equipment, disrupt supply of key services like water or electricity, or, in the most extreme scenarios, directly endanger human lives.

This convergence of physical and digital security requires an entirely new approach to risk management combining traditional cybersecurity with deep understanding of the physical processes those digital systems control, requiring expertise that rarely exists within a single team or department, creating an organizational challenge alongside a technical one.

## The Path Forward: Resilience Instead of Perfect Defense

Given the scale and sophistication of threats facing critical infrastructure, an increasing number of experts advocate a shift from a philosophy trying to achieve perfect prevention of every possible attack toward a resilience philosophy that accepts some attacks will succeed in breaking through, but focuses efforts on rapid detection, isolation, and recovery to minimize actual damage and the time needed to return to normal functioning.

This philosophical shift requires investment not only in preventive security measures but also in monitoring capabilities that can quickly detect unusual activity, network segmentation limiting how far an attacker can reach after initial infiltration, and recovery plans enabling rapid restoration of critical functions even if primary systems are compromised.

## Ransomware as an Economic Threat to Critical Infrastructure

Ransomware attacks on critical infrastructure operators have evolved from rare, isolated incidents into a systematic, financially motivated threat that occasionally succeeds in paralyzing significant portions of national infrastructure.

## AI as a Double-Edged Sword in Cybersecurity

AI tools are increasingly used both for defending critical infrastructure, through faster anomaly detection in network traffic, and for attack, through automated generation of more sophisticated phishing campaigns or vulnerability identification.

## Precise Growth Figures: A More Dramatic Trend Than Often Perceived

According to Forescout's "2024 Threat Roundup" report, which relies on data from the European Repository of Cyber Incidents, reported security incidents in critical infrastructure worldwide grew by 668% since 2022 — a figure dramatically exceeding the intuitive perception of gradual, linear threat growth. IBM's X-Force Threat Intelligence Index for 2024 further reveals that critical infrastructure accounted for nearly 70% of all global cyberattacks during 2023, with Europe bearing the greatest burden, accounting for 32% of global incidents.

Additional analysis shows that attacks on critical infrastructure grew 30% just between January 2023 and January 2024, reaching over 420 million attacks annually — equivalent to 13 attacks every second worldwide. The healthcare sector deserves particular attention within this broader picture, accounting for 14.2% of all attacks targeting critical infrastructure according to World Economic Forum data for 2024, while Sophos research found two-thirds of surveyed healthcare organizations suffered a ransomware attack in the prior year.

This dramatic growth, documented across multiple independent sources using different data-collection methodologies, confirms that critical infrastructure cybersecurity isn't an abstract, theoretical concern but a measurable, rapidly growing operational risk requiring proportionally urgent increases in defensive investment.

## Case Study: The Colonial Pipeline Attack

The May 2021 ransomware attack on Colonial Pipeline remains the most concrete, best-documented example of what critical infrastructure disruption through a cyberattack can look like in practice. The DarkSide attacker group gained access to the company's systems through a single compromised password associated with an inactive VPN account — likely obtained through credential reuse from a prior data breach, not through a sophisticated, targeted attack. After extracting about 100 GB of data and encrypting critical files, the company preemptively shut down the entire pipeline — the largest refined-products pipeline in the US, transporting over 100 million gallons of fuel daily and supplying 45% of the East Coast's fuel.

The six-day operational shutdown, from May 7 to May 12, 2021, caused mass panic buying of fuel, long lines at gas stations, and a measurable rise in fuel prices (estimated at an average of 4 cents per gallon in affected regions), prompting President Biden to declare a state of emergency. Colonial Pipeline paid a ransom of 75 bitcoin, then worth $4.4 million, despite earlier statements it wouldn't do so — a decision the company's CEO justified by uncertainty about the actual scope of the compromise and a desire to accelerate recovery. The Department of Justice subsequently managed to recover approximately 64 of the bitcoins paid.

This attack directly prompted Biden's Executive Order on Improving the Nation's Cybersecurity, which emphasized the need for increased threat-intelligence sharing among agencies, called for securing the software supply chain, and resulted in creating the Cyber Safety Review Board. A key lesson researchers drew from the case is that the company preemptively shut down the entire physical operational system (OT network) as soon as it discovered the attack on IT systems, even before confirming the OT network was compromised — a move that, while economically costly, prevented the attack from directly threatening pipeline physical safety.

## Case Study: Russia's Seven-Year Campaign Against Ukraine's Power Grid

Alongside the financially motivated Colonial Pipeline attack, Ukraine's power grid offers a contrasting, equally instructive example — a proven, continuous state campaign targeting critical infrastructure over seven years, conducted by the Russian hacker group Sandworm (identified by the US as Unit 74455 of Russian military intelligence). The first attack, on December 23, 2015, left 230,000 consumers without power in freezing temperatures for one to six hours — the first publicly confirmed successful cyberattack on a power grid in history.

A year later, on December 17, 2016, Sandworm carried out a considerably more sophisticated, automated attack using malware called Industroyer, which cut power to a fifth of Kyiv for one hour — an attack experts consider a deliberate, smaller-scale capability test rather than an attempt at maximum damage. Code analysis revealed Sandworm tried to disable overcurrent protection on the substation's protective relays to cause permanent physical equipment damage when operators re-energized the system — an attempt that failed only due to a coding error, not Ukrainian defensive measures.

The most significant third attack occurred on April 8, 2022, a month and a half after Russia's full-scale military invasion of Ukraine, using a new variant of the same malware called Industroyer2, targeting high-voltage substations. According to CERT-UA and ESET reports, attackers had infiltrated target systems as early as February, waiting until the planned attack date — evidence of the long-term, patient prepositioning described earlier in this text. This time the attack was quickly detected and neutralized before causing major disruption, despite simultaneous deployment of additional data-wiping malware on other systems, including Ukrainian banks.

According to a US Congressional Research Service report, physical missile and drone attacks on Ukrainian energy infrastructure during the war proved strategically more significant than cyberattacks, bringing the grid to the brink of collapse in late 2022 — but the combination of both approaches illustrates how modern military campaigns against critical infrastructure combine traditional kinetic weapons with parallel, continuous cyber campaigns, rather than relying exclusively on one method or the other.

![Scale of the SolarWinds Attack](chart10b_solarwinds.png)
*Chart 10b: Number of organizations affected by the SolarWinds 2020 attack — over 18,000.*

## Case Study: SolarWinds as the Paradigm of Supply Chain Attacks

The attack on SolarWinds, discovered in December 2020, remains the best-documented example of the previously described supply-chain vulnerability in practice — showing how compromising a single, seemingly peripheral software vendor can simultaneously endanger thousands of organizations that trust it. Attackers, later attributed by Mandiant to the APT29 group linked to Russia's Foreign Intelligence Service, infiltrated the build system for SolarWinds' Orion product, embedding malware called Sunburst into routine update versions distributed between March and June 2020.

The scale was unprecedented — over 18,000 organizations, including Microsoft, the US Department of Homeland Security, Commerce Department, and Treasury Department, unknowingly installed the compromised update, giving attackers remote access to their systems. The malicious updates were digitally signed with legitimate SolarWinds certificates, making them entirely invisible to standard security checks — organizations trusted and installed the update without suspicion, precisely because it came from a trusted, established distribution channel.

Financial consequences were significant — according to IronNet's 2021 Cybersecurity Impact Report, 85% of victims reported an impact ranging from "small" to "significant," while average cost was roughly 11% of affected companies' annual revenue (14% for US companies). Google Cloud analysis published two years after the discovery shows a lasting impact on the broader security landscape — supply-chain compromise rose from less than 1% of all intrusions in 2020 to 17% in 2021, with as much as 86% of those subsequent intrusions directly linked to the SolarWinds breach.

This case, together with the Colonial Pipeline attack a month and a half later and the Kaseya ransomware attack in July 2021, prompted the Cybersecurity and Infrastructure Security Agency (CISA) to issue concrete guidance on mitigating software supply-chain risk, including an executive order requiring "Software Bills of Materials" (SBOMs) — documentation transparently listing all third-party components embedded in a software product, enabling organizations to more quickly identify whether they're affected by future, similar attacks.

## Conclusion

Cybersecurity of critical infrastructure represents one of the most significant, yet simultaneously least visible battlefields of the modern era. Unlike traditional military conflicts unfolding visibly, with a clear beginning and end, this domain is characterized by continuous, quiet competition unfolding during formal peacetime, with implications extending far beyond the traditional military context into the very ability of modern societies to function safely and reliably.

---

#Cybersecurity #CriticalInfrastructure #SolarWinds #ColonialPipeline #Ransomware
