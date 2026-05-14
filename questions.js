// EMERLIMITATOR — Datos del examen
// LRE = Launch & Recovery Element (examen completo)
// MCE = Mission Crew Element (sin TAKE OFF ABORT ni LANDING PIO RECOVERY)

const EXAM_DATA = {
  emergencyProcedures: [
    {
      id: 'locp',
      title: 'LOSS OF CONTROL PREVENT',
      modes: ['LRE', 'MCE'],
      steps: [
        'LANDING CONFIGURATION COMMAND',
        'MTS POSITION MODE'
      ]
    },
    {
      id: 'ef',
      title: 'ENGINE FAILURE',
      modes: ['LRE', 'MCE'],
      steps: [
        'GLIDE ESTABLISH',
        'LANDING SITE SELECT',
        'CONDITION LEVER AFT, AS REQUIRED'
      ]
    },
    {
      id: 'efrd',
      title: 'ENGINE FIRE/ RPM DECAY ON GROUND',
      modes: ['LRE', 'MCE'],
      steps: [
        'CONDITION LEVER AFT'
      ]
    },
    {
      id: 'tdf',
      title: "TOTAL DOWNLINK FAILURE BELOW 2000' AGL OR ON THE GROUND",
      modes: ['LRE', 'MCE'],
      steps: [
        'UPLINK/ COMMAND LINK OFF'
      ]
    },
    {
      id: 'toa',
      title: 'TAKE OFF ABORT',
      modes: ['LRE'],
      steps: [
        'THROTTLE FULL REVERSE',
        'BRAKES APPLY'
      ]
    },
    {
      id: 'lpior',
      title: 'LANDING PIO RECOVERY',
      modes: ['LRE'],
      steps: [
        'CONTROL STICK AFT AND HOLD',
        'THROTTLE FULL FORWARD'
      ]
    }
  ],

  systemLimits: [
    {
      id: 'egt',
      category: 'EGT',
      parameters: [
        {
          id: 'egt_min', label: 'Min',
          inputs: [{ id: 'egt_min_v', answer: '300' }],
          suffix: 'ºC'
        },
        {
          id: 'egt_nif', label: 'Normal In-Flight Range',
          inputs: [{ id: 'egt_nif_lo', answer: '350' }, { separator: '-' }, { id: 'egt_nif_hi', answer: '650' }],
          suffix: 'ºC'
        },
        {
          id: 'egt_max', label: 'Max',
          inputs: [{ id: 'egt_max_v', answer: '675' }],
          suffix: 'ºC'
        },
        {
          id: 'egt_nsr', label: 'Normal Start Range',
          inputs: [{ id: 'egt_nsr_lo', answer: '695' }, { separator: '-' }, { id: 'egt_nsr_hi', answer: '700' }],
          suffix: 'ºC'
        },
        {
          id: 'egt_mso', label: 'Max for Start Only',
          inputs: [{ id: 'egt_mso_v', answer: '770' }, { separator: 'for' }, { id: 'egt_mso_d', answer: '1' }],
          suffix: 'second'
        }
      ]
    },
    {
      id: 'misc',
      category: 'Miscellaneous',
      parameters: [
        { id: 'misc_mcwa',  label: 'Max Crosswind ATLC',       inputs: [{ id: 'misc_mcwa_v',  answer: '20'    }], suffix: 'kts' },
        { id: 'misc_mcws',  label: 'Max Crosswind (sym)',       inputs: [{ id: 'misc_mcws_v',  answer: '15'    }], suffix: 'kts' },
        { id: 'misc_mcwas', label: 'Max Crosswind (asym)',      inputs: [{ id: 'misc_mcwas_v', answer: '13'    }], suffix: 'kts' },
        { id: 'misc_mt',    label: 'Max Tailwind',              inputs: [{ id: 'misc_mt_v',    answer: '10'    }], suffix: 'kts' },
        { id: 'misc_mwad',  label: 'Max wind any direction',    inputs: [{ id: 'misc_mwad_v',  answer: '30'    }], suffix: 'kts' },
        { id: 'misc_mgf',   label: 'Max Gust Factor',           inputs: [{ id: 'misc_mgf_v',   answer: '20'    }], suffix: 'kts' },
        { id: 'misc_mrw',   label: 'Max Ramp Weight',           inputs: [{ id: 'misc_mrw_v',   answer: '10500' }], suffix: 'lbs' },
        { id: 'misc_mlw',   label: 'Max Landing Weight',        inputs: [{ id: 'misc_mlw_v',   answer: '8500'  }], suffix: 'lbs' },
        { id: 'misc_mfw',   label: 'Max Fuel Weight',           inputs: [{ id: 'misc_mfw_v',   answer: '3764'  }], suffix: 'lbs' },
        {
          id: 'misc_aoa', label: 'Angle of Attack Range',
          inputs: [{ id: 'misc_aoa_lo', answer: '-6' }, { separator: 'to' }, { id: 'misc_aoa_hi', answer: '10' }],
          suffix: 'º'
        }
      ]
    },
    {
      id: 'mts',
      category: 'MTS',
      parameters: [
        {
          id: 'mts_ot', label: 'Operating Temperature',
          inputs: [{ id: 'mts_ot_lo', answer: '-40' }, { separator: 'to' }, { id: 'mts_ot_hi', answer: '55' }],
          suffix: 'ºC'
        },
        { id: 'mts_oa',  label: 'Operational Altitude',   inputs: [{ id: 'mts_oa_v',  answer: '50000' }], suffix: 'ft' },
        { id: 'mts_lrd', label: 'LRD/LTM Op. Altitude',  inputs: [{ id: 'mts_lrd_v', answer: '45000' }], suffix: 'ft' }
      ]
    },
    {
      id: 'engine',
      category: 'Engine',
      parameters: [
        {
          id: 'eng_tn', label: 'Torque Normal',
          inputs: [{ id: 'eng_tn_lo', answer: '0' }, { separator: 'to' }, { id: 'eng_tn_hi', answer: '104' }],
          suffix: '%'
        },
        { id: 'eng_tm', label: 'Torque Maximum', inputs: [{ id: 'eng_tm_v', answer: '107.8' }], suffix: '%' },
        {
          id: 'eng_rn', label: 'RPM Normal',
          inputs: [{ id: 'eng_rn_lo', answer: '65' }, { separator: 'to' }, { id: 'eng_rn_hi', answer: '100.5' }],
          suffix: '%'
        },
        {
          id: 'eng_rm', label: 'RPM Maximum',
          inputs: [{ id: 'eng_rm_v', answer: '105.5' }, { separator: 'for' }, { id: 'eng_rm_d', answer: '30' }],
          suffix: 'seconds'
        }
      ]
    },
    {
      id: 'oil_temp',
      category: 'Oil Temperature',
      subcategories: [
        {
          id: 'ot_es', subcategory: 'Engine Start',
          parameters: [
            { id: 'ot_es_min', label: 'Min',    inputs: [{ id: 'ot_es_min_v', answer: '-20' }], suffix: 'ºC' },
            {
              id: 'ot_es_nor', label: 'Normal',
              inputs: [{ id: 'ot_es_nor_lo', answer: '-20' }, { separator: '-' }, { id: 'ot_es_nor_hi', answer: '110' }],
              suffix: 'ºC'
            },
            { id: 'ot_es_max', label: 'Max',    inputs: [{ id: 'ot_es_max_v', answer: '110' }], suffix: 'ºC' }
          ]
        },
        {
          id: 'ot_gt', subcategory: 'Ground and Taxi',
          parameters: [
            { id: 'ot_gt_min', label: 'Min',    inputs: [{ id: 'ot_gt_min_v', answer: '56'  }], suffix: 'ºC' },
            {
              id: 'ot_gt_nor', label: 'Normal',
              inputs: [{ id: 'ot_gt_nor_lo', answer: '56' }, { separator: '-' }, { id: 'ot_gt_nor_hi', answer: '119' }],
              suffix: 'ºC'
            },
            { id: 'ot_gt_max', label: 'Max',    inputs: [{ id: 'ot_gt_max_v', answer: '119' }], suffix: 'ºC' }
          ]
        },
        {
          id: 'ot_tf', subcategory: 'Takeoff and Flight',
          parameters: [
            { id: 'ot_tf_min', label: 'Min',    inputs: [{ id: 'ot_tf_min_v', answer: '56'  }], suffix: 'ºC' },
            {
              id: 'ot_tf_nor', label: 'Normal',
              inputs: [{ id: 'ot_tf_nor_lo', answer: '70' }, { separator: '-' }, { id: 'ot_tf_nor_hi', answer: '115' }],
              suffix: 'ºC'
            },
            { id: 'ot_tf_max', label: 'Max',    inputs: [{ id: 'ot_tf_max_v', answer: '119' }], suffix: 'ºC' }
          ]
        }
      ]
    },
    {
      id: 'oil_pres',
      category: 'Oil Pressure',
      parameters: [
        { id: 'op_min', label: 'Min',                   inputs: [{ id: 'op_min_v', answer: '44'  }], suffix: 'psi' },
        {
          id: 'op_nor', label: 'Normal Operating Range',
          inputs: [{ id: 'op_nor_lo', answer: '50' }, { separator: '-' }, { id: 'op_nor_hi', answer: '120' }],
          suffix: 'psi'
        },
        { id: 'op_max', label: 'Max',                   inputs: [{ id: 'op_max_v', answer: '126' }], suffix: 'psi' }
      ]
    },
    {
      id: 'tank_fuel',
      category: 'Tank Fuel Temp',
      parameters: [
        { id: 'tft_min', label: 'Min',          inputs: [{ id: 'tft_min_v', answer: '-30' }], suffix: 'ºC' },
        {
          id: 'tft_nor', label: 'Normal Range',
          inputs: [{ id: 'tft_nor_lo', answer: '-21' }, { separator: '-' }, { id: 'tft_nor_hi', answer: '49' }],
          suffix: 'ºC'
        },
        { id: 'tft_max', label: 'Max',          inputs: [{ id: 'tft_max_v', answer: '55'  }], suffix: 'ºC' }
      ]
    },
    {
      id: 'op_speed',
      category: 'Operating Speed',
      parameters: [
        { id: 'os_ne',   label: 'Never Exceed',            inputs: [{ id: 'os_ne_v',   answer: '230' }], suffix: 'KIAS' },
        { id: 'os_mgit', label: 'Max Gear In Transit',     inputs: [{ id: 'os_mgit_v', answer: '135' }], suffix: 'KIAS' },
        { id: 'os_mge',  label: 'Max Gear Extended',       inputs: [{ id: 'os_mge_v',  answer: '160' }], suffix: 'KIAS' },
        {
          id: 'os_msmw', label: 'Maneuvering Speed at Max Weight',
          inputs: [
            { id: 'os_msmw_v', answer: '158' },
            { separator: 'KIAS at' },
            { id: 'os_msmw_r', answer: '-4.5' },
            { separator: 'Kts per' },
            { id: 'os_msmw_w', answer: '500' }
          ],
          suffix: 'lbs decrease'
        }
      ]
    }
  ]
};
