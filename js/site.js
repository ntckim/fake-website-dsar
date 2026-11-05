(function () {
  const CART_KEY = "njbaskets.cart";
  const RECEIPT_KEY = "njbaskets.receipt";
  const SHOP_EMAIL = "info@nj-baskets-handmade.boutique";
  const FULFILL = {
    pickup: "Pickup at the barn in Califon",
    nj: "Ship to a New Jersey address",
    us: "Ship elsewhere in the United States"
  };

  let currentNote = "";
  let renderCartPage = function () {};
  let toastTimer = 0;

  const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function esc(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function money(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(amount);
  }

  function getProduct(id) {
    return window.PRODUCTS.find(function (product) { return product.id === id; });
  }

  function today() {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date());
  }

  function toast(html) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.innerHTML = html;
    el.classList.add("is-on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { el.classList.remove("is-on"); }, 7000);
  }

  function readCart() {
    let raw = [];
    try {
      raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch (err) {
      raw = [];
    }
    if (!Array.isArray(raw)) return [];
    return raw.reduce(function (list, item) {
      if (!item || !getProduct(item.id)) return list;
      const qty = Math.min(6, Math.floor(Number(item.qty)));
      if (qty > 0) list.push({ id: item.id, qty: qty });
      return list;
    }, []);
  }

  function writeCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    renderCartCount();
  }

  function renderCartCount() {
    const count = readCart().reduce(function (sum, item) { return sum + item.qty; }, 0);
    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      el.textContent = String(count);
    });
    const noun = count === 1 ? "item" : "items";
    document.querySelectorAll(".bag-link").forEach(function (el) {
      el.setAttribute("aria-label", "Bag, " + count + " " + noun);
    });
  }

  function addToCart(id, qty) {
    const product = getProduct(id);
    if (!product) return;
    sessionStorage.removeItem(RECEIPT_KEY);
    const want = Math.max(1, Math.floor(Number(qty)) || 1);
    const cart = readCart();
    const line = cart.find(function (item) { return item.id === id; });
    const current = line ? line.qty : 0;
    const next = Math.min(6, current + want);
    const added = next - current;
    if (added <= 0) {
      toast("Six is the most we can weave of one basket at a time. <a href=\"visit.html\">Write us</a> for more.");
      return;
    }
    if (line) line.qty = next;
    else cart.push({ id: id, qty: next });
    writeCart(cart);
    const name = esc(product.name);
    const message = added === 1
      ? "Added the " + name + "."
      : "Added " + added + " of the " + name + ".";
    const limit = added < want ? " Six is the limit on one shape." : "";
    toast(message + limit + " <a href=\"cart.html\">View bag</a>");
  }

  function productArt(product) {
    return `<img src="${product.image}" alt="${esc(product.alt || product.name)}" width="1200" height="1200">`;
  }

  function productCard(product, heading) {
    const tag = heading || "h2";
    return `
      <article class="product-card">
        <a class="card-link" href="basket.html?id=${product.id}">
          <div class="card-art panel-${product.panel}">
            ${productArt(product)}
          </div>
          <div class="card-copy">
            <p class="kicker">${esc(product.category)}</p>
            <${tag}>${esc(product.name)}</${tag}>
            <p class="card-size">${esc(product.size)}</p>
          </div>
        </a>
        <div class="card-buy">
          <p class="price">${money(product.price)}</p>
          <button type="button" class="text-btn" data-add-id="${product.id}">Add to bag</button>
        </div>
      </article>`;
  }

  function initNav() {
    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".site-nav");
    if (!toggle || !nav) return;

    function close() {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.textContent = "Menu";
    }

    toggle.addEventListener("click", function () {
      const open = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Close" : "Menu";
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) close();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        close();
        toggle.focus();
      }
    });
  }

  function initHome() {
    const featured = window.PRODUCTS.filter(function (product) { return product.featured; });
    const rest = window.PRODUCTS.filter(function (product) { return !product.featured; });
    const mount = document.querySelector("#featured");
    if (!mount || featured.length < 3) return;
    mount.innerHTML = `
      <div class="feature-main">${productCard(featured[0], "h3")}</div>
      <div class="feature-side">
        ${productCard(featured[1], "h3")}
        ${productCard(featured[2], "h3")}
      </div>`;
    const also = document.querySelector("#also-list");
    if (also) {
      also.innerHTML = rest.map(function (product) {
        return `<li><a href="basket.html?id=${product.id}">${esc(product.name)}</a></li>`;
      }).join("");
    }
  }

  function initShop() {
    const grid = document.querySelector("#product-grid");
    const filters = document.querySelector("#filters");
    const countEl = document.querySelector("#shop-count");
    if (!grid || !filters) return;

    const order = ["All", "Everyday", "Picnic", "Table", "Garden", "Home", "Gifts"];
    const list = order.filter(function (cat) {
      return cat === "All" || window.PRODUCTS.some(function (product) { return product.category === cat; });
    });
    const requested = new URLSearchParams(location.search).get("cat") || "All";
    let current = list.includes(requested) ? requested : "All";

    function render() {
      filters.innerHTML = list.map(function (cat) {
        const count = cat === "All"
          ? window.PRODUCTS.length
          : window.PRODUCTS.filter(function (product) { return product.category === cat; }).length;
        const pressed = cat === current ? "true" : "false";
        return `<button type="button" aria-pressed="${pressed}" data-cat="${esc(cat)}">${esc(cat)} <span class="filter-count">${count}</span></button>`;
      }).join("");

      const items = current === "All"
        ? window.PRODUCTS
        : window.PRODUCTS.filter(function (product) { return product.category === current; });
      grid.innerHTML = items.map(function (product) {
        return productCard(product, "h2");
      }).join("");

      if (countEl) {
        if (current === "All") countEl.textContent = items.length + " baskets, made to order.";
        else {
          const noun = items.length === 1 ? "basket" : "baskets";
          countEl.textContent = items.length + " " + current.toLowerCase() + " " + noun + ".";
        }
      }
    }

    filters.addEventListener("click", function (event) {
      const button = event.target.closest("[data-cat]");
      if (!button) return;
      current = button.dataset.cat;
      try {
        const url = new URL(location.href);
        if (current === "All") url.searchParams.delete("cat");
        else url.searchParams.set("cat", current);
        history.replaceState(null, "", url);
      } catch (err) {
        /* Leave the address alone if the browser refuses it. */
      }
      render();
    });

    render();
  }

  function initBasket() {
    const root = document.querySelector("#product-root");
    if (!root) return;
    const id = new URLSearchParams(location.search).get("id");
    const product = getProduct(id);
    if (!product) {
      document.title = "Basket not found · NJ Baskets";
      root.innerHTML = `
        <header class="page-intro">
          <p class="kicker">Missing basket</p>
          <h1>That one isn’t on the bench.</h1>
          <p class="lede">The link may be old. The shop has what we’re weaving now.</p>
          <p style="margin-top:1.25rem"><a class="btn btn-primary" href="shop.html">Back to the shop</a></p>
        </header>`;
      return;
    }

    document.title = product.name + " · NJ Baskets";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", product.summary);

    const related = window.PRODUCTS.filter(function (item) {
      return item.id !== product.id && item.category === product.category;
    }).concat(window.PRODUCTS.filter(function (item) {
      return item.id !== product.id && item.category !== product.category;
    })).slice(0, 3);

    const bulky = product.bulky
      ? " This one ships in a larger box, which we quote before we start."
      : "";

    root.innerHTML = `
      <article class="detail">
        <div class="detail-art panel-${product.panel}">
          ${productArt(product)}
        </div>
        <div class="detail-copy">
          <p class="crumbs"><a href="shop.html">Shop</a> / <a href="shop.html?cat=${encodeURIComponent(product.category)}">${esc(product.category)}</a></p>
          <h1>${esc(product.name)}</h1>
          <p class="detail-price">${money(product.price)}</p>
          <p class="lede">${esc(product.summary)}</p>
          <div class="buy-row">
            <div class="qty">
              <button type="button" data-qty-dec aria-label="Fewer">−</button>
              <input data-qty value="1" readonly aria-label="Quantity">
              <button type="button" data-qty-inc aria-label="More">+</button>
            </div>
            <button type="button" class="btn btn-primary" data-detail-add>Add to bag</button>
          </div>
          <p class="fine">Made to order in Califon. ${esc(product.lead)}. Pickup is free, and shipping is quoted when we confirm.${bulky} <a href="craft.html">How a basket gets made</a>.</p>
          <dl class="specs">
            <div><dt>Material</dt><dd>${esc(product.material)}</dd></div>
            <div><dt>Weave</dt><dd>${esc(product.weave)}</dd></div>
            <div><dt>Size</dt><dd>${esc(product.size)}</dd></div>
            <div><dt>Weight</dt><dd>${esc(product.weight)}</dd></div>
            <div><dt>Maker</dt><dd>${esc(product.maker)}</dd></div>
            <div><dt>SKU</dt><dd>${esc(product.sku)}</dd></div>
            <div><dt>Origin</dt><dd>Califon, New Jersey</dd></div>
          </dl>
          <div class="prose">
            ${product.paragraphs.map(function (paragraph) { return `<p>${esc(paragraph)}</p>`; }).join("")}
            <p>If a weaver lets go, bring it back. We repair baskets we made.</p>
          </div>
          <blockquote class="bench-note"><p>${esc(product.bench)}</p></blockquote>
        </div>
      </article>
      <section class="related">
        <h2>Also on the bench</h2>
        <div class="product-grid">
          ${related.map(function (item) { return productCard(item, "h3"); }).join("")}
        </div>
      </section>`;

    const qtyInput = root.querySelector("[data-qty]");
    root.querySelector("[data-qty-dec]").addEventListener("click", function () {
      qtyInput.value = String(Math.max(1, Number(qtyInput.value) - 1));
    });
    root.querySelector("[data-qty-inc]").addEventListener("click", function () {
      if (Number(qtyInput.value) >= 6) {
        toast("Six is the most we can weave of one basket at a time.");
        return;
      }
      qtyInput.value = String(Number(qtyInput.value) + 1);
    });
    root.querySelector("[data-detail-add]").addEventListener("click", function () {
      addToCart(product.id, Number(qtyInput.value));
    });
  }

  function subtotal(cart) {
    return cart.reduce(function (sum, item) {
      const product = getProduct(item.id);
      return sum + (product ? product.price * item.qty : 0);
    }, 0);
  }

  function lineView(item) {
    const product = getProduct(item.id);
    const bulky = product.bulky ? `<p class="card-size">Ships in a larger box. We quote that with the order.</p>` : "";
    return `
      <article class="cart-line">
        <a class="cart-thumb panel-${product.panel}" href="basket.html?id=${product.id}" tabindex="-1" aria-hidden="true">
          ${productArt(product)}
        </a>
        <div>
          <div class="cart-heading">
            <h2><a href="basket.html?id=${product.id}">${esc(product.name)}</a></h2>
            <p class="price">${money(product.price * item.qty)}</p>
          </div>
          <p class="card-size">${esc(product.size)} · ${money(product.price)} each</p>
          ${bulky}
          <div class="cart-controls">
            <div class="qty">
              <button type="button" data-qty-delta="-1" data-id="${product.id}" aria-label="Fewer ${esc(product.name)}">−</button>
              <input type="text" readonly value="${item.qty}" aria-label="Quantity for ${esc(product.name)}">
              <button type="button" data-qty-delta="1" data-id="${product.id}" aria-label="More ${esc(product.name)}">+</button>
            </div>
            <button type="button" class="text-btn" data-remove="${product.id}">Remove</button>
          </div>
        </div>
      </article>`;
  }

  function setCartHeading(title, lede) {
    const titleEl = document.querySelector("#cart-title");
    const ledeEl = document.querySelector("#cart-lede");
    if (titleEl) titleEl.textContent = title;
    if (ledeEl) ledeEl.textContent = lede;
  }

  function loadReceipt() {
    try {
      return JSON.parse(sessionStorage.getItem(RECEIPT_KEY) || "null");
    } catch (err) {
      return null;
    }
  }

  function mailHref(subject, body) {
    return "mailto:" + SHOP_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  function orderText(order) {
    const items = order.items.map(function (item) {
      return "- " + item.name + " (" + item.sku + ") × " + item.qty + " — " + money(item.line);
    }).join("\n");
    const address = order.address
      ? "Address: " + order.address
      : "Address: Pickup at 19 Splint Lane, Califon, NJ 07830";
    return [
      "NJ Baskets order request " + order.reference,
      order.date,
      "",
      "Name: " + order.name,
      "Email: " + order.email,
      "Fulfillment: " + FULFILL[order.fulfillment],
      address,
      "",
      "Items:",
      items,
      "",
      "Baskets subtotal: " + money(order.subtotal),
      "Shipping: please quote",
      "",
      "Notes:",
      order.notes || "None"
    ].join("\n");
  }

  function receiptHTML(order) {
    currentNote = orderText(order);
    const subject = "Order " + order.reference + " from " + order.name;
    return `
      <div class="receipt-card">
        <p class="kicker">${esc(order.reference)}</p>
        <pre class="note-preview">${esc(currentNote)}</pre>
        <div class="actions">
          <a class="btn btn-primary" href="${esc(mailHref(subject, currentNote))}">Open in email</a>
          <button type="button" class="btn" data-copy>Copy note</button>
        </div>
        <p class="fine">Send it to ${SHOP_EMAIL}. If the email app doesn’t open, copy the note. Nothing is charged on this page.</p>
        <button type="button" class="text-btn" data-clear-receipt>Start another order</button>
      </div>`;
  }

  function renderLines(options) {
    const layout = document.querySelector("#cart-layout");
    const lines = document.querySelector("#cart-lines");
    const form = document.querySelector("#order-form");
    const receiptEl = document.querySelector("#receipt");
    if (!layout || !lines || !form || !receiptEl) return;

    const cart = readCart();
    const receipt = loadReceipt();

    if (!cart.length && receipt) {
      layout.hidden = true;
      receiptEl.hidden = false;
      receiptEl.innerHTML = receiptHTML(receipt);
      setCartHeading(
        "Your order note is ready.",
        "It stays on this page until you email it. We don’t see the order before that."
      );
    } else if (!cart.length) {
      receiptEl.hidden = true;
      receiptEl.innerHTML = "";
      layout.hidden = false;
      layout.classList.add("is-single");
      form.hidden = true;
      lines.innerHTML = `
        <div class="empty-state">
          <p>When you add a basket, it waits here until you send the workshop a note.</p>
          <p><a class="btn btn-primary" href="shop.html">Shop the collection</a></p>
        </div>`;
      setCartHeading("The bench is clear.", "Add a basket from the shop and it will wait here.");
    } else {
      receiptEl.hidden = true;
      layout.hidden = false;
      layout.classList.remove("is-single");
      form.hidden = false;
      lines.innerHTML = cart.map(lineView).join("") + `
        <div class="subtotal-row"><span>Baskets</span><strong>${money(subtotal(cart))}</strong></div>
        <p class="fine">Shipping is not included. Pickup in Califon is free. Recent New Jersey deliveries have been $18, and most out-of-state boxes fall between $22 and $36.</p>`;
      setCartHeading(
        "Baskets to be woven.",
        "Send a note and we confirm by email before we start. Payment is by invoice, not on this page."
      );
    }

    if (options && options.focusTitle) {
      const title = document.querySelector("#cart-title");
      if (title) {
        title.setAttribute("tabindex", "-1");
        title.focus();
      }
    }
  }

  function changeQty(id, delta) {
    const cart = readCart();
    const line = cart.find(function (item) { return item.id === id; });
    if (!line) return;
    const next = line.qty + delta;
    if (next > 6) {
      toast("Six is the most we can weave of one basket at a time.");
      return;
    }
    const updated = next <= 0
      ? cart.filter(function (item) { return item.id !== id; })
      : cart.map(function (item) { return item.id === id ? { id: id, qty: next } : item; });
    writeCart(updated);
    renderLines();
  }

  function syncShipFields() {
    const form = document.querySelector("#order-form");
    if (!form) return;
    const ship = form.fulfillment.value !== "pickup";
    const wrap = document.querySelector("#address-field");
    const input = document.querySelector("#address");
    wrap.hidden = !ship;
    input.required = ship;
    if (!ship) {
      input.removeAttribute("aria-invalid");
      const error = wrap.querySelector(".field-error");
      if (error) error.remove();
    }
  }

  function clearErrors(form) {
    form.querySelectorAll(".field-error").forEach(function (el) { el.remove(); });
    form.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
    const alert = form.querySelector("[data-form-alert]");
    if (alert) alert.hidden = true;
  }

  function validateForm(form) {
    clearErrors(form);
    let first = null;
    const fields = Array.from(form.querySelectorAll("input, textarea, select")).filter(function (el) {
      return el.type !== "hidden" && !el.closest("[hidden]") && !el.disabled;
    });

    function fail(el, message) {
      el.setAttribute("aria-invalid", "true");
      const note = document.createElement("p");
      note.className = "field-error";
      note.textContent = message;
      el.insertAdjacentElement("afterend", note);
      if (!first) first = el;
    }

    fields.forEach(function (el) {
      const value = el.value.trim();
      if (el.required && !value) fail(el, "This one is required.");
      else if (el.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        fail(el, "Enter an email address we can reply to.");
      }
    });

    if (first) {
      const alert = form.querySelector("[data-form-alert]");
      if (alert) {
        alert.hidden = false;
        alert.textContent = "Check the fields marked below.";
      }
      first.focus();
      return false;
    }
    return true;
  }

  async function copyText(text, button) {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied";
    } catch (err) {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-999px";
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (copyErr) { ok = false; }
      area.remove();
      button.textContent = ok ? "Copied" : "Select the note above";
    }
    window.setTimeout(function () { button.textContent = original; }, 2200);
  }

  function initCart() {
    const lines = document.querySelector("#cart-lines");
    const form = document.querySelector("#order-form");
    const receiptEl = document.querySelector("#receipt");
    if (!lines || !form || !receiptEl) return;

    renderCartPage = renderLines;
    renderLines();
    syncShipFields();

    lines.addEventListener("click", function (event) {
      const qty = event.target.closest("[data-qty-delta]");
      if (qty) changeQty(qty.dataset.id, Number(qty.dataset.qtyDelta));
      const remove = event.target.closest("[data-remove]");
      if (remove) {
        writeCart(readCart().filter(function (item) { return item.id !== remove.dataset.remove; }));
        renderLines();
      }
    });

    form.fulfillment.addEventListener("change", syncShipFields);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!readCart().length) {
        renderLines();
        return;
      }
      if (!validateForm(form)) return;
      const cart = readCart();
      const order = {
        reference: "NB-" + Math.floor(1000 + Math.random() * 9000),
        date: today(),
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        fulfillment: form.fulfillment.value,
        address: form.fulfillment.value === "pickup" ? "" : form.address.value.trim(),
        notes: form.notes.value.trim(),
        items: cart.map(function (item) {
          const product = getProduct(item.id);
          return {
            sku: product.sku,
            name: product.name,
            qty: item.qty,
            price: product.price,
            line: product.price * item.qty
          };
        }),
        subtotal: subtotal(cart)
      };
      sessionStorage.setItem(RECEIPT_KEY, JSON.stringify(order));
      writeCart([]);
      form.reset();
      syncShipFields();
      renderLines({ focusTitle: true });
    });

    receiptEl.addEventListener("click", function (event) {
      const copy = event.target.closest("[data-copy]");
      if (copy) copyText(currentNote, copy);
      if (event.target.closest("[data-clear-receipt]")) {
        sessionStorage.removeItem(RECEIPT_KEY);
        currentNote = "";
        renderLines({ focusTitle: true });
      }
    });
  }

  function visitText(form) {
    return [
      "NJ Baskets workshop note",
      today(),
      "",
      "Name: " + form.name.value.trim(),
      "Email: " + form.email.value.trim(),
      "About: " + form.topic.value,
      "",
      form.message.value.trim()
    ].join("\n");
  }

  function initVisit() {
    const form = document.querySelector("#visit-form");
    const success = document.querySelector("#visit-success");
    if (!form || !success) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!validateForm(form)) return;
      const note = visitText(form);
      currentNote = note;
      success.hidden = false;
      form.hidden = true;
      success.querySelector("[data-note]").textContent = note;
      success.querySelector("[data-mail]").setAttribute("href", mailHref("Workshop note from " + form.name.value.trim(), note));
      const heading = success.querySelector("h2");
      heading.setAttribute("tabindex", "-1");
      heading.focus();
      if (motionOK) success.scrollIntoView({ block: "start" });
    });

    success.addEventListener("click", function (event) {
      const copy = event.target.closest("[data-copy]");
      if (copy) copyText(currentNote, copy);
      if (event.target.closest("[data-reset]")) {
        form.reset();
        clearErrors(form);
        form.hidden = false;
        success.hidden = true;
        const name = form.querySelector("#visit-name");
        if (name) name.focus();
      }
    });
  }

  document.addEventListener("click", function (event) {
    const button = event.target.closest("[data-add-id]");
    if (!button) return;
    addToCart(button.dataset.addId, 1);
  });

  initNav();
  renderCartCount();

  const page = document.body.dataset.page;
  if (page === "home") initHome();
  if (page === "shop") initShop();
  if (page === "basket") initBasket();
  if (page === "cart") initCart();
  if (page === "visit") initVisit();

  window.addEventListener("storage", function (event) {
    if (event.key !== CART_KEY) return;
    renderCartCount();
    if (page === "cart") renderCartPage();
  });
})();
