/* ===================================================================
   Generic Multi-Step Wizard Engine
   Schema-driven form wizard — reusable across projects.

   Usage:
     const wizard = new Wizard({
       containerId: 'my-wizard',
       title: 'CREATE SCENARIO',
       steps: [ { id, label, fields: [...] }, ... ],
       onComplete(data) { ... },
       onCancel() { ... },
     });
     wizard.open();

   Field types:
     text, textarea, number, select, checkbox, group (nested fields),
     tags (multi-select chips), coordinates (lat/lon/alt), list (dynamic add/remove)
   =================================================================== */

export class Wizard {
  /**
   * @param {object} opts
   * @param {string} opts.containerId  — DOM id of the wizard container element
   * @param {string} opts.title        — displayed at top of wizard
   * @param {Array}  opts.steps        — step definitions (see field schema below)
   * @param {function} opts.onComplete — called with assembled data object
   * @param {function} [opts.onCancel] — called when user cancels
   * @param {object} [opts.defaults]   — pre-populated field values keyed by field id
   */
  constructor(opts) {
    this.container = document.getElementById(opts.containerId);
    if (!this.container) throw new Error(`Wizard container #${opts.containerId} not found`);
    this.title = opts.title || 'WIZARD';
    this.steps = opts.steps;
    this.onComplete = opts.onComplete;
    this.onCancel = opts.onCancel || (() => {});
    this.defaults = opts.defaults || {};
    this.currentStep = 0;
    this.data = { ...this.defaults };
    this._listCounters = {};
  }

  // ── Public API ──────────────────────────────────────────────

  open() {
    this.currentStep = 0;
    this.data = { ...this.defaults };
    this._listCounters = {};
    this._render();
    this.container.style.display = 'flex';
  }

  close() {
    this.container.style.display = 'none';
    this.container.innerHTML = '';
  }

  // ── Rendering ───────────────────────────────────────────────

  _render() {
    const step = this.steps[this.currentStep];
    const total = this.steps.length;
    const stepNum = this.currentStep + 1;

    this.container.innerHTML = '';

    // Header
    const header = _el('div', 'wiz-header');
    header.innerHTML = `<div class="wiz-title">${this.title}</div>
      <div class="wiz-progress">STEP ${stepNum} / ${total} — ${step.label}</div>
      <div class="wiz-bar"><div class="wiz-bar-fill" style="width:${(stepNum / total) * 100}%"></div></div>`;
    this.container.appendChild(header);

    // Body — scrollable field area
    const body = _el('div', 'wiz-body');
    if (step.description) {
      const desc = _el('div', 'wiz-step-desc');
      desc.textContent = step.description;
      body.appendChild(desc);
    }
    (step.fields || []).forEach(f => body.appendChild(this._renderField(f)));
    this.container.appendChild(body);

    // Footer — nav buttons
    const footer = _el('div', 'wiz-footer');
    const btnCancel = _btn('CANCEL', 'wiz-btn wiz-btn-cancel', () => { this.close(); this.onCancel(); });
    footer.appendChild(btnCancel);

    const rightBtns = _el('div', 'wiz-footer-right');
    if (this.currentStep > 0) {
      rightBtns.appendChild(_btn('BACK', 'wiz-btn', () => { this._collectValues(); this.currentStep--; this._render(); }));
    }
    if (this.currentStep < total - 1) {
      rightBtns.appendChild(_btn('NEXT', 'wiz-btn wiz-btn-primary', () => {
        if (!this._validateStep(step)) return;
        this._collectValues();
        this.currentStep++;
        this._render();
      }));
    } else {
      rightBtns.appendChild(_btn('CREATE', 'wiz-btn wiz-btn-primary', () => {
        if (!this._validateStep(step)) return;
        this._collectValues();
        this.close();
        this.onComplete(this.data);
      }));
    }
    footer.appendChild(rightBtns);
    this.container.appendChild(footer);
  }

  _renderField(field) {
    if (field.type === 'group') return this._renderGroup(field);
    if (field.type === 'list') return this._renderList(field);

    const wrap = _el('div', 'wiz-field');
    const label = _el('label', 'wiz-label');
    label.textContent = field.label + (field.required ? ' *' : '');
    if (field.hint) {
      const hint = _el('span', 'wiz-hint');
      hint.textContent = field.hint;
      label.appendChild(hint);
    }
    wrap.appendChild(label);

    const val = this.data[field.id] !== undefined ? this.data[field.id] : (field.default ?? '');
    let input;

    switch (field.type) {
      case 'text':
        input = _el('input', 'wiz-input');
        input.type = 'text';
        input.value = val;
        if (field.placeholder) input.placeholder = field.placeholder;
        break;

      case 'textarea':
        input = _el('textarea', 'wiz-input wiz-textarea');
        input.value = val;
        input.rows = field.rows || 3;
        if (field.placeholder) input.placeholder = field.placeholder;
        break;

      case 'number':
        input = _el('input', 'wiz-input');
        input.type = 'number';
        input.value = val;
        if (field.min !== undefined) input.min = field.min;
        if (field.max !== undefined) input.max = field.max;
        if (field.step !== undefined) input.step = field.step;
        if (field.placeholder) input.placeholder = field.placeholder;
        break;

      case 'select':
        input = _el('select', 'wiz-input');
        (field.options || []).forEach(o => {
          const opt = document.createElement('option');
          if (typeof o === 'string') { opt.value = o; opt.textContent = o; }
          else { opt.value = o.value; opt.textContent = o.label; }
          input.appendChild(opt);
        });
        input.value = val || (field.options?.[0]?.value ?? field.options?.[0] ?? '');
        break;

      case 'checkbox':
        input = _el('input', 'wiz-checkbox');
        input.type = 'checkbox';
        input.checked = !!val;
        break;

      case 'tags': {
        const tagsWrap = _el('div', 'wiz-tags-wrap');
        const selected = Array.isArray(val) ? [...val] : [];
        const searchInput = _el('input', 'wiz-input wiz-tags-search');
        searchInput.placeholder = field.placeholder || 'Search...';

        const chipsEl = _el('div', 'wiz-tags-chips');
        const optionsEl = _el('div', 'wiz-tags-options');

        const renderChips = () => {
          chipsEl.innerHTML = '';
          selected.forEach(v => {
            const chip = _el('span', 'wiz-tag-chip');
            chip.textContent = v;
            const x = _el('span', 'wiz-tag-x');
            x.textContent = '×';
            x.onclick = () => { selected.splice(selected.indexOf(v), 1); renderChips(); renderOptions(); };
            chip.appendChild(x);
            chipsEl.appendChild(chip);
          });
        };

        const allOptions = (field.options || []).map(o => typeof o === 'string' ? o : o.value);
        const renderOptions = () => {
          const q = searchInput.value.toLowerCase();
          optionsEl.innerHTML = '';
          allOptions
            .filter(o => !selected.includes(o) && o.toLowerCase().includes(q))
            .slice(0, 12)
            .forEach(o => {
              const item = _el('div', 'wiz-tags-option');
              item.textContent = o;
              item.onclick = () => { selected.push(o); renderChips(); renderOptions(); };
              optionsEl.appendChild(item);
            });
        };

        searchInput.oninput = renderOptions;
        renderChips();
        renderOptions();
        tagsWrap.appendChild(chipsEl);
        tagsWrap.appendChild(searchInput);
        tagsWrap.appendChild(optionsEl);
        wrap.appendChild(tagsWrap);
        wrap.dataset.fieldId = field.id;
        wrap.dataset.fieldType = 'tags';
        wrap._getTagsValue = () => [...selected];
        return wrap;
      }

      case 'coordinates': {
        const coordWrap = _el('div', 'wiz-coord-wrap');
        const coordVal = typeof val === 'object' && val ? val : {};
        const subfields = field.subfields || [
          { key: 'lat', label: 'LAT', placeholder: '0.0' },
          { key: 'lon', label: 'LON', placeholder: '0.0' },
          { key: 'alt', label: 'ALT', placeholder: '2000000' },
        ];
        subfields.forEach(sf => {
          const sub = _el('div', 'wiz-coord-field');
          const subLabel = _el('span', 'wiz-coord-label');
          subLabel.textContent = sf.label;
          const subInput = _el('input', 'wiz-input wiz-coord-input');
          subInput.type = 'number';
          subInput.step = 'any';
          subInput.placeholder = sf.placeholder || '';
          subInput.value = coordVal[sf.key] ?? '';
          subInput.dataset.coordKey = sf.key;
          sub.appendChild(subLabel);
          sub.appendChild(subInput);
          coordWrap.appendChild(sub);
        });
        wrap.appendChild(coordWrap);
        wrap.dataset.fieldId = field.id;
        wrap.dataset.fieldType = 'coordinates';
        return wrap;
      }

      default:
        input = _el('input', 'wiz-input');
        input.type = 'text';
        input.value = val;
    }

    if (input) {
      input.dataset.fieldId = field.id;
      wrap.appendChild(input);
    }
    return wrap;
  }

  _renderGroup(field) {
    const wrap = _el('div', 'wiz-group');
    const legend = _el('div', 'wiz-group-legend');
    legend.textContent = field.label;
    wrap.appendChild(legend);
    (field.fields || []).forEach(f => {
      // Namespace group fields: groupId.fieldId
      const nsField = { ...f, id: `${field.id}.${f.id}` };
      wrap.appendChild(this._renderField(nsField));
    });
    return wrap;
  }

  _renderList(field) {
    const wrap = _el('div', 'wiz-field wiz-list-field');
    const label = _el('label', 'wiz-label');
    label.textContent = field.label;
    wrap.appendChild(label);

    if (!this._listCounters[field.id]) this._listCounters[field.id] = 0;

    const listEl = _el('div', 'wiz-list-items');
    listEl.dataset.listId = field.id;

    // Restore existing items
    const existing = this.data[field.id];
    if (Array.isArray(existing)) {
      existing.forEach((item, i) => {
        this._listCounters[field.id] = Math.max(this._listCounters[field.id], i + 1);
        listEl.appendChild(this._renderListItem(field, i, item));
      });
    }

    const addBtn = _btn('+ ADD', 'wiz-btn wiz-btn-small', () => {
      const idx = this._listCounters[field.id]++;
      listEl.appendChild(this._renderListItem(field, idx));
    });

    wrap.appendChild(listEl);
    wrap.appendChild(addBtn);
    return wrap;
  }

  _renderListItem(field, idx, values = {}) {
    const item = _el('div', 'wiz-list-item');
    item.dataset.listIdx = idx;
    const itemFields = _el('div', 'wiz-list-item-fields');
    (field.itemFields || []).forEach(f => {
      const nsField = { ...f, id: `${field.id}[${idx}].${f.id}` };
      if (values[f.id] !== undefined) this.data[nsField.id] = values[f.id];
      itemFields.appendChild(this._renderField(nsField));
    });
    const removeBtn = _btn('×', 'wiz-btn wiz-btn-remove', () => item.remove());
    item.appendChild(itemFields);
    item.appendChild(removeBtn);
    return item;
  }

  // ── Data Collection ─────────────────────────────────────────

  _collectValues() {
    // Standard inputs
    this.container.querySelectorAll('[data-field-id]').forEach(el => {
      if (el.closest('.wiz-tags-wrap')) return; // handled separately
      const key = el.dataset.fieldId;
      if (el.type === 'checkbox') this.data[key] = el.checked;
      else if (el.type === 'number') this.data[key] = el.value !== '' ? Number(el.value) : '';
      else this.data[key] = el.value;
    });

    // Coordinate fields
    this.container.querySelectorAll('[data-field-type="coordinates"]').forEach(wrap => {
      const key = wrap.dataset.fieldId;
      const obj = {};
      wrap.querySelectorAll('[data-coord-key]').forEach(inp => {
        obj[inp.dataset.coordKey] = inp.value !== '' ? Number(inp.value) : undefined;
      });
      this.data[key] = obj;
    });

    // Tags fields
    this.container.querySelectorAll('[data-field-type="tags"]').forEach(wrap => {
      const key = wrap.dataset.fieldId;
      if (wrap._getTagsValue) this.data[key] = wrap._getTagsValue();
    });
  }

  _validateStep(step) {
    this._collectValues();
    for (const field of (step.fields || [])) {
      if (field.required && !this._hasValue(field.id)) {
        this._showError(`"${field.label}" is required.`);
        return false;
      }
      if (field.type === 'group') {
        for (const sub of (field.fields || [])) {
          const nsId = `${field.id}.${sub.id}`;
          if (sub.required && !this._hasValue(nsId)) {
            this._showError(`"${sub.label}" in "${field.label}" is required.`);
            return false;
          }
        }
      }
    }
    return true;
  }

  _hasValue(id) {
    const v = this.data[id];
    if (v === undefined || v === null || v === '') return false;
    if (typeof v === 'object' && !Array.isArray(v)) {
      return Object.values(v).some(x => x !== undefined && x !== '' && x !== null);
    }
    return true;
  }

  _showError(msg) {
    let errEl = this.container.querySelector('.wiz-error');
    if (!errEl) {
      errEl = _el('div', 'wiz-error');
      const body = this.container.querySelector('.wiz-body');
      if (body) body.prepend(errEl);
    }
    errEl.textContent = msg;
    setTimeout(() => errEl.remove(), 4000);
  }
}

// ── Helpers ─────────────────────────────────────────────────

/** Assemble flat wizard data (with dotted/bracket keys) into nested object. */
export function assembleData(flat) {
  const out = {};
  for (const [key, val] of Object.entries(flat)) {
    _setNested(out, key, val);
  }
  return out;
}

function _setNested(obj, path, val) {
  // Handle list bracket syntax: "actions[0].id" → ["actions", "0", "id"]
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    const nextIsIdx = /^\d+$/.test(parts[i + 1]);
    if (cur[p] === undefined) cur[p] = nextIsIdx ? [] : {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = val;
}

function _el(tag, cls) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
}

function _btn(text, cls, onClick) {
  const b = document.createElement('button');
  b.className = cls;
  b.textContent = text;
  b.type = 'button';
  b.onclick = onClick;
  return b;
}
