(() => {
  const CONFIG_URL = "/apps/preorder-pulse/config";
  const SUBSCRIBE_URL = "/apps/preorder-pulse/subscribe";
  const TRACK_URL = "/apps/preorder-pulse/track";

  let config = null;
  let currentVariantId = null;
  let impressionSent = { preorder: false, notify: false };

  function trackEvent(eventType, ruleId) {
    const params = new URLSearchParams({ event: eventType });
    if (ruleId) params.set("ruleId", ruleId);
    fetch(`${TRACK_URL}?${params.toString()}`).catch(() => {});
  }

  async function fetchConfig() {
    const response = await fetch(CONFIG_URL);
    if (!response.ok) return null;
    return response.json();
  }

  function getVariantId() {
    const input =
      document.querySelector('form[action*="/cart/add"] [name="id"]') ||
      document.querySelector('[name="id"]');
    return input?.value ? `gid://shopify/ProductVariant/${input.value}` : null;
  }

  function isVariantAvailable() {
    const json = document.querySelector("[data-product-json]");
    if (!json) return true;
    try {
      const product = JSON.parse(json.textContent);
      const variant = product.variants?.find(
        (v) => String(v.id) === String(currentVariantId?.split("/").pop()),
      );
      return variant?.available ?? true;
    } catch {
      return true;
    }
  }

  function findPreorderRule(variantId) {
    if (!config?.preorders) return null;
    return config.preorders.find((r) => r.variantId === variantId);
  }

  function renderPreorder(mount, rule) {
    const deposit =
      rule.depositPercent < 100
        ? `定金 ${rule.depositPercent}%，余款发货时收取`
        : "全款预售";

    mount.innerHTML = `
      <div class="pp-storefront__preorder">
        <span class="pp-storefront__badge" style="background:${config.barAccentColor};color:#fff">
          ${config.preorderButtonText || "立即预售"}
        </span>
        ${
          rule.fulfillmentDate
            ? `<p class="pp-storefront__date">预计发货：${rule.fulfillmentDate}</p>`
            : `<p class="pp-storefront__date">补货后尽快发货</p>`
        }
        <p class="pp-storefront__deposit">${deposit}</p>
      </div>
    `;
    mount.style.background = config.barBgColor;
    mount.style.color = config.barTextColor;
    mount.classList.remove("pp-storefront__hidden");

    if (!impressionSent.preorder) {
      impressionSent.preorder = true;
      trackEvent("preorder_impression", rule.variantId);
    }
  }

  function renderNotify(mount, productData) {
    mount.innerHTML = `
      <div class="pp-storefront__notify">
        <p>该商品暂时缺货，留下邮箱补货后通知您。</p>
        <form class="pp-storefront__notify-form" data-pp-notify-form>
          <input
            class="pp-storefront__input"
            type="email"
            name="email"
            placeholder="your@email.com"
            required
          />
          <button
            class="pp-storefront__btn"
            type="submit"
            style="background:${config.barAccentColor}"
          >
            ${config.notifyButtonText || "到货通知我"}
          </button>
        </form>
        <div class="pp-storefront__message pp-storefront__hidden" data-pp-message></div>
      </div>
    `;
    mount.style.background = config.barBgColor;
    mount.style.color = config.barTextColor;
    mount.classList.remove("pp-storefront__hidden");

    const form = mount.querySelector("[data-pp-notify-form]");
    const messageEl = mount.querySelector("[data-pp-message]");

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      if (!email) return;

      const btn = form.querySelector("button");
      btn.disabled = true;

      try {
        const response = await fetch(SUBSCRIBE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            productId: productData.productId,
            variantId: currentVariantId,
            productTitle: productData.productTitle,
            variantTitle: productData.variantTitle,
          }),
        });

        const result = await response.json();
        messageEl.classList.remove("pp-storefront__hidden", "pp-storefront__message--error", "pp-storefront__message--success");

        if (response.ok) {
          messageEl.textContent = config.notifySuccessText || "已加入等候名单";
          messageEl.classList.add("pp-storefront__message--success");
          trackEvent("notify_submit", currentVariantId);
          form.reset();
        } else {
          messageEl.textContent = result.error || "订阅失败，请重试";
          messageEl.classList.add("pp-storefront__message--error");
        }
      } catch {
        messageEl.classList.remove("pp-storefront__hidden");
        messageEl.textContent = "网络错误，请重试";
        messageEl.classList.add("pp-storefront__message--error");
      } finally {
        btn.disabled = false;
      }
    });

    if (!impressionSent.notify) {
      impressionSent.notify = true;
      trackEvent("notify_impression", currentVariantId);
    }
  }

  function hideMount(mount) {
    mount.innerHTML = "";
    mount.classList.add("pp-storefront__hidden");
  }

  function getProductData() {
    const root = document.querySelector("[data-pp-product-id]");
    return {
      productId: root?.dataset.ppProductId ?? "",
      productTitle: root?.dataset.ppProductTitle ?? "",
      variantTitle: root?.dataset.ppVariantTitle ?? "",
    };
  }

  function updateUI() {
    if (!config?.enabled) return;

    currentVariantId = getVariantId();
    const mounts = document.querySelectorAll("[data-pp-mount]");
    if (!mounts.length || !currentVariantId) return;

    const preorderRule = findPreorderRule(currentVariantId);
    const available = isVariantAvailable();

    mounts.forEach((mount) => {
      const mode = mount.dataset.ppMode;

      if (mode === "preorder" && preorderRule) {
        renderPreorder(mount, preorderRule);
        return;
      }

      if (mode === "notify" && !available && !preorderRule) {
        renderNotify(mount, getProductData());
        return;
      }

      hideMount(mount);
    });
  }

  function bindVariantChange() {
    document.addEventListener("change", (e) => {
      if (e.target?.name === "id") {
        impressionSent = { preorder: false, notify: false };
        updateUI();
      }
    });

    const pubsub = window?.Shopify?.theme?.events;
    if (pubsub?.subscribe) {
      pubsub.subscribe("variant:change", () => {
        impressionSent = { preorder: false, notify: false };
        setTimeout(updateUI, 50);
      });
    }
  }

  async function init() {
    config = await fetchConfig();
    if (!config?.enabled) return;

    bindVariantChange();
    updateUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
