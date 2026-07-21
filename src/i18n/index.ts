import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import ptCommon from './locales/pt-BR/common.json'
import ptSidebar from './locales/pt-BR/sidebar.json'
import ptLogin from './locales/pt-BR/login.json'
import ptPacientes from './locales/pt-BR/pacientes.json'
import ptAgendamentos from './locales/pt-BR/agendamentos.json'
import ptCrm from './locales/pt-BR/crm.json'
import ptIa from './locales/pt-BR/ia.json'

import enCommon from './locales/en-US/common.json'
import enSidebar from './locales/en-US/sidebar.json'
import enLogin from './locales/en-US/login.json'
import enPacientes from './locales/en-US/pacientes.json'
import enAgendamentos from './locales/en-US/agendamentos.json'
import enCrm from './locales/en-US/crm.json'
import enIa from './locales/en-US/ia.json'

const savedLang = localStorage.getItem('sgsm-lang') ?? 'pt-BR'

i18n.use(initReactI18next).init({
  lng: savedLang,
  fallbackLng: 'pt-BR',
  ns: ['common', 'sidebar', 'login', 'pacientes', 'agendamentos', 'crm', 'ia'],
  defaultNS: 'common',
  resources: {
    'pt-BR': {
      common: ptCommon,
      sidebar: ptSidebar,
      login: ptLogin,
      pacientes: ptPacientes,
      agendamentos: ptAgendamentos,
      crm: ptCrm,
      ia: ptIa,
    },
    'en-US': {
      common: enCommon,
      sidebar: enSidebar,
      login: enLogin,
      pacientes: enPacientes,
      agendamentos: enAgendamentos,
      crm: enCrm,
      ia: enIa,
    },
  },
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})

export default i18n
