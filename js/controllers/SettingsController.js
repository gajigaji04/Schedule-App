// Controller — Settings
// Profile save, accent-color picker, and light/dark mode toggle.
class SettingsController {
  static #bound = false;

  static init() {
    const user = UserModel.getCurrent();
    document.getElementById('set-name').value  = user.name;
    document.getElementById('set-email').value = user.email;

    if (!this.#bound) {
      this.#bindSave();
      this.#initColorPicker();
      this.#initModePicker();
      this.#bound = true;
    } else {
      this.#syncColorSwatch();
      this.#syncModeSwatch();
    }
  }

  // ---------- profile ----------

  static #bindSave() {
    document.getElementById('save-settings').onclick = async () => {
      const name  = document.getElementById('set-name').value.trim();
      const email = document.getElementById('set-email').value.trim();
      if (!name || !email) return;
      try {
        await UserModel.update({ name, email });
        HeaderView.render(UserModel.getCurrent());
        this.#showSaveToast();
      } catch (err) {
        this.#showSaveToast(`저장 실패: ${err.message}`);
      }
    };
  }

  // ---------- accent color ----------

  static #initColorPicker() {
    this.#syncColorSwatch();

    document.querySelectorAll('.color-swatch[data-color]').forEach(btn => {
      btn.addEventListener('click', () => {
        ThemeService.apply(btn.dataset.color);
        this.#setActiveSwatch(btn.dataset.color);
      });
    });

    const customInput = document.getElementById('custom-color-input');
    customInput.addEventListener('input', () => {
      ThemeService.apply('custom', customInput.value);
      this.#setActiveSwatch('custom');
    });

    document.getElementById('custom-swatch-label').addEventListener('click', () => {
      customInput.click();
    });
  }

  static #syncColorSwatch() {
    const savedKey    = localStorage.getItem('ts_color') || 'indigo';
    const savedCustom = localStorage.getItem('ts_custom_color') || null;
    this.#setActiveSwatch(savedKey);
    if (savedKey === 'custom' && savedCustom) {
      document.getElementById('custom-color-input').value = savedCustom;
    }
  }

  static #setActiveSwatch(key) {
    document.querySelectorAll('.color-swatch[data-color], .custom-swatch-btn').forEach(el => {
      el.classList.remove('active');
    });
    if (key === 'custom') {
      document.querySelector('.custom-swatch-btn')?.classList.add('active');
    } else {
      document.querySelector(`.color-swatch[data-color="${key}"]`)?.classList.add('active');
    }
  }

  // ---------- light / dark mode ----------

  static #initModePicker() {
    this.#syncModeSwatch();
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        localStorage.setItem('ts_theme', mode);
        applyMode(mode); // defined in app.js
      });
    });
  }

  static #syncModeSwatch() {
    const saved = localStorage.getItem('ts_theme') || 'auto';
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === saved);
    });
  }

  // ---------- save toast ----------

  static #showSaveToast(msg = '저장되었습니다') {
    let toast = document.getElementById('save-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'save-toast';
      toast.className = 'save-toast';
      document.body.appendChild(toast);
    }
    const isError = msg !== '저장되었습니다';
    toast.innerHTML = `<i class="fas fa-${isError ? 'exclamation-circle' : 'check-circle'}"></i> ${msg}`;
    toast.classList.toggle('save-toast--error', isError);
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible', 'save-toast--error'), 2200);
  }
}
