'use client'

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'

const DIGIT_COUNT = 6

export function TwoFactorCodeInput({
  id,
  name = 'code',
  value,
  onChange,
  required = true,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: {
  id?: string
  name?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const digits = [...value.split(''), ...Array<string>(DIGIT_COUNT).fill('')].slice(0, DIGIT_COUNT)

  const focusDigit = (index: number) => {
    inputRefs.current[Math.max(0, Math.min(index, DIGIT_COUNT - 1))]?.focus()
  }

  const setDigit = (index: number, rawValue: string) => {
    const next = [...digits]
    const cleaned = rawValue.replace(/\D/g, '')
    if (cleaned.length > 1) {
      cleaned.slice(0, DIGIT_COUNT - index).split('').forEach((digit, offset) => { next[index + offset] = digit })
      onChange(next.join(''))
      focusDigit(index + cleaned.length)
      return
    }
    next[index] = cleaned
    onChange(next.join(''))
    if (next[index]) focusDigit(index + 1)
  }

  const pasteCode = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGIT_COUNT - index)
    if (!pasted) return
    event.preventDefault()
    const next = [...digits]
    pasted.split('').forEach((digit, offset) => { next[index + offset] = digit })
    onChange(next.join(''))
    focusDigit(index + pasted.length)
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault()
      const next = [...digits]
      next[index - 1] = ''
      onChange(next.join(''))
      focusDigit(index - 1)
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusDigit(index - 1)
    } else if (event.key === 'ArrowRight' && index < DIGIT_COUNT - 1) {
      event.preventDefault()
      focusDigit(index + 1)
    }
  }

  return <div className="sb-code-input" role="group" aria-describedby={ariaDescribedBy}>
    <input className="sb-code-input-value" name={name} value={value} required={required} maxLength={DIGIT_COUNT} pattern="[0-9]{6}" tabIndex={-1} aria-hidden="true" readOnly />
    {digits.map((digit, index) => <input key={index} ref={(element) => { inputRefs.current[index] = element }} id={index === 0 ? id : undefined} className="sb-code-digit" type="text" value={digit} inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} maxLength={1} pattern="[0-9]" aria-label={`Digit ${index + 1} of ${DIGIT_COUNT}`} aria-invalid={index === 0 ? ariaInvalid : undefined} onChange={(event) => setDigit(index, event.currentTarget.value)} onKeyDown={(event) => handleKeyDown(index, event)} onPaste={(event) => pasteCode(index, event)} />)}
  </div>
}
