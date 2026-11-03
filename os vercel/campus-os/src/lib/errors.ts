import i18n from '../i18n';
export const errorMessage=(error:unknown)=>{const key=error instanceof Error?error.message:'unknown';return i18n.exists(`validation.${key}`)?i18n.t(`validation.${key}`):i18n.exists(`ai.error.${key}`)?i18n.t(`ai.error.${key}`):i18n.t('common.error');};
