import { PropType, ComputedRef, toRef, computed, provide, inject } from 'vue';
import { locales, getDefault } from '../utils/defaults';
import { default as Locale, LocaleConfig } from '../utils/locale';
import { Attribute } from '../utils/attribute';
import { isObject } from '../utils/_';
import { Theme, useTheme } from './theme';
import { DarkModeConfig, DarkModeConfigObj } from './darkMode';

export interface BaseProps {
  color: string;
  isDark?: DarkModeConfig;
  theme?: string;
  locale?: string | Record<string, any> | Locale;
  firstDayOfWeek: number;
  masks?: Record<string, any>;
  timezone?: string;
  minDate?: Date;
  minDateExact?: Date;
  maxDate?: Date;
  maxDateExact?: Date;
  disabledDates?: [];
  availableDates?: [];
}

const contextKey = '__vc_base_context__';

export const propsDef = {
  color: {
    type: String,
    default: () => getDefault('color'),
  },
  isDark: {
    type: [Boolean, String, Object as PropType<DarkModeConfigObj>],
    default: () => getDefault('isDark'),
  },
  firstDayOfWeek: Number,
  masks: Object,
  locale: [String, Object],
  timezone: String,
  minDate: null,
  maxDate: null,
  minDateExact: null,
  maxDateExact: null,
  disabledDates: null,
  availableDates: null,
};

export function createBase(props: BaseProps, ctx: any) {
  // #region Computed

  const theme = useTheme(toRef(props, 'color'), toRef(props, 'isDark'));

  const locale = computed(() => {
    // Return the locale prop if it is an instance of the Locale class
    if (props.locale instanceof Locale) return props.locale;
    // Build up a base config from component props
    const config = (
      isObject(props.locale)
        ? props.locale
        : {
            id: props.locale,
            firstDayOfWeek: props.firstDayOfWeek,
            masks: props.masks,
          }
    ) as Partial<LocaleConfig>;
    // Return new locale
    return new Locale(config, {
      locales: locales.value,
      timezone: props.timezone,
    });
  });

  const masks = computed(() => locale.value.masks);

  const disabledDates = computed(() => {
    const dates = locale.value.normalizeDates(props.disabledDates, {
      isAllDay: true,
    });
    // Add disabled range for min date
    if (props.minDateExact || props.minDate) {
      const end = props.minDateExact
        ? locale.value.normalizeDate(props.minDateExact)
        : locale.value.normalizeDate(props.minDate!, { time: '00:00:00' });
      dates.push({
        start: null,
        end: new Date(end.getTime() - 1000),
      });
    }
    // Add disabled range for min date
    if (props.maxDateExact || props.maxDate) {
      const start = props.maxDateExact
        ? locale.value.normalizeDate(props.maxDateExact)
        : locale.value.normalizeDate(props.maxDate!, { time: '23:59:59' });
      dates.push({
        start: new Date(start.getTime() + 1000),
        end: null,
      });
    }
    return dates;
  });

  const availableDates = computed(() => {
    return locale.value.normalizeDates(props.availableDates, {
      isAllDay: false,
    });
  });

  const disabledAttribute = computed(() => {
    return new Attribute(
      {
        key: 'disabled',
        dates: disabledDates.value,
        excludeDates: availableDates.value,
        excludeMode: 'includes',
        order: 100,
      },
      theme,
      locale.value,
    );
  });

  // #endregion Computed

  const context = {
    theme,
    locale,
    masks,
    disabledDates,
    availableDates,
    disabledAttribute,
  };
  provide(contextKey, context);
  return context;
}

export interface BaseContext {
  theme: Theme;
  locale: ComputedRef<Locale>;
  masks: ComputedRef<Record<string, string>>;
  disabledDates: ComputedRef<any[]>;
  availableDates: ComputedRef<any[]>;
  disabledAttribute: ComputedRef<Attribute>;
}

export function useBase() {
  let context = inject<BaseContext>(contextKey);
  if (context) return context;
  throw new Error(
    'Base context missing. Please verify this component is nested within a valid context provider.',
  );
}
