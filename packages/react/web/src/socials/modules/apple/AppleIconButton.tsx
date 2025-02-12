import { IconButton, IconButtonProps } from 'socials/components/IconButton'

import { AppleIcon } from '../../generated/icons'

/**
 * IconButtonProps에서 'socialType'과 'icon'을 제외한 속성들을 상속받습니다.
 */
export interface AppleIconButtonProps
  extends Omit<IconButtonProps, 'socialType' | 'icon'> {}

/**
 * @category Socials/Apple
 *
 * 애플 아이콘 버튼 UI 컴포넌트입니다.
 * {@link @codebase/react-web#IconButton | `IconButton`} 컴포넌트를 기반으로 하며, 애플 아이콘 및 버튼 스타일링이 가능합니다.
 *
 *  @param props - IconButtonProps에서 'socialType'과 'icon'을 제외한 속성들을 상속받습니다.
 * @returns 애플 아이콘 버튼 컴포넌트를 반환합니다.
 */
export const AppleIconButton = (props: AppleIconButtonProps) => {
  return (
    <IconButton
      socialType="apple"
      icon={<AppleIcon style={{ marginBottom: '3px' }} />}
      {...props}
    />
  )
}
