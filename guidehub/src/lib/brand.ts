export type GuideSkin = 'studio' | 'journey' | 'protocol' | 'playbook' | 'ritual'

export interface GuideBrand {
  skin: GuideSkin
  label: string
  eyebrow: string
  description: string
  accent: string
  soft: string
}

const BRAND_MAP: Record<GuideSkin, Omit<GuideBrand, 'skin'>> = {
  studio: {
    label: 'Studio Guide',
    eyebrow: 'Polished digital edition',
    description: 'A refined format for premium guides, explainers, and creator products.',
    accent: '#B85C38',
    soft: '#F6E6DC',
  },
  journey: {
    label: 'Journey Guide',
    eyebrow: 'Route-ready publishing',
    description: 'Built for itineraries, destination packs, and place-based expertise.',
    accent: '#1F7A8C',
    soft: '#E4F3F5',
  },
  protocol: {
    label: 'Protocol Program',
    eyebrow: 'Outcome-led structure',
    description: 'Designed for training programs, phases, systems, and step-based progress.',
    accent: '#6A8A24',
    soft: '#F1F5DF',
  },
  playbook: {
    label: 'Tactical Playbook',
    eyebrow: 'System-first delivery',
    description: 'Great for frameworks, checklists, business systems, and operating manuals.',
    accent: '#3458D8',
    soft: '#E7ECFF',
  },
  ritual: {
    label: 'Guided Ritual',
    eyebrow: 'Calm, paced practice',
    description: 'A softer format for wellness flows, reflective programs, and mindful routines.',
    accent: '#5E7A68',
    soft: '#E6EFE8',
  },
}

function resolveSkin(template: string, isCourse = false): GuideSkin {
  if (isCourse || template === 'course') return 'protocol'

  switch (template) {
    case 'travel':
      return 'journey'
    case 'checklist':
    case 'tech':
      return 'playbook'
    default:
      return 'studio'
  }
}

export function getGuideBrand(template: string, isCourse = false): GuideBrand {
  const skin = resolveSkin(template, isCourse)
  return { skin, ...BRAND_MAP[skin] }
}

export function getTemplateNote(template: string, isCourse = false): string {
  return getGuideBrand(template, isCourse).description
}
