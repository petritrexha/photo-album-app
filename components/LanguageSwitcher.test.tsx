import { render, screen, fireEvent } from '@testing-library/react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { LanguageProvider } from '@/lib/language-context'

// Mock the language context
const mockSetLang = jest.fn()

jest.mock('@/lib/language-context', () => ({
  ...jest.requireActual('@/lib/language-context'),
  useLang: () => ({
    lang: 'en',
    setLang: mockSetLang,
    t: (key: string) => key,
  }),
}))

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    mockSetLang.mockClear()
  })

  it('renders compact version correctly', () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher compact />
      </LanguageProvider>
    )

    expect(screen.getByText('🇽🇰 SQ')).toBeInTheDocument()
  })

  it('renders full version correctly', () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher />
      </LanguageProvider>
    )

    expect(screen.getByText('🇽🇰 SQ')).toBeInTheDocument()
    expect(screen.getByText('EN')).toBeInTheDocument()
  })

  it('calls setLang when compact button is clicked', () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher compact />
      </LanguageProvider>
    )

    const button = screen.getByText('🇽🇰 SQ')
    fireEvent.click(button)

    expect(mockSetLang).toHaveBeenCalledWith('sq')
  })

  it('calls setLang when full version button is clicked', () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher />
      </LanguageProvider>
    )

    const sqButton = screen.getByText('🇽🇰 SQ')
    fireEvent.click(sqButton)

    expect(mockSetLang).toHaveBeenCalledWith('sq')
  })
})