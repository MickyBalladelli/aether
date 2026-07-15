import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import type { ReactNode } from 'react'
import {
  APP_LANGUAGES,
  TRANSLATIONS
} from './translations'
import type {
  AppLanguage,
  TranslationKey
} from './translations'

const LANGUAGE_STORAGE_KEY = 'aether:language'

type TranslationValues = Record<string, string | number>

type I18nContextValue = {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
  t: (key: TranslationKey, values?: TranslationValues) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(loadLanguage)

  useEffect(() => {
    document.documentElement.lang = language

    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch {
      return
    }
  }, [language])

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage)
  }, [])
  const t = useCallback((
    key: TranslationKey,
    values: TranslationValues = {}
  ) => interpolate(TRANSLATIONS[language][key], values), [language])
  const value = useMemo(() => ({ language, setLanguage, t }), [
    language,
    setLanguage,
    t
  ])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const value = useContext(I18nContext)

  if (!value) {
    throw new Error('useI18n must be used inside I18nProvider')
  }

  return value
}

function loadLanguage(): AppLanguage {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)

    return APP_LANGUAGES.includes(stored as AppLanguage)
      ? stored as AppLanguage
      : 'en'
  } catch {
    return 'en'
  }
}

function interpolate(message: string, values: TranslationValues) {
  return message.replace(/\{\{(\w+)\}\}/g, (placeholder, key: string) => (
    key in values ? String(values[key]) : placeholder
  ))
}
