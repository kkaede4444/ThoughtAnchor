import type { Settings } from './model'

// Device classification is supplied by the host, so rotation and resizing do not
// unexpectedly replace the workbench while somebody is editing.
export function resolveInterface(
  mode: Settings['interfaceMode'],
  platform: 'windows' | 'android',
  tablet: boolean
): 'mobile' | 'desktop' {
  return mode === 'auto' ? (platform === 'windows' || tablet ? 'desktop' : 'mobile') : mode
}
