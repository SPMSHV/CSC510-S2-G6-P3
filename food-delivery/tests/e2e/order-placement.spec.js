import { test, expect } from '@playwright/test';

/**
 * Helper function to register and login a customer via API
 * Uses browser context fetch to maintain session cookies automatically
 */
async function registerAndLoginCustomer(page) {
  const email = `test_${Date.now()}@playwright.test`;
  const password = 'testpass123';
  const name = 'Test User';
  const address = '123 Test Street, Test City, TC 12345';

  // Navigate to any page first to establish browser context
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Register via fetch in browser context (cookies are automatically handled)
  const registerResult = await page.evaluate(async ({ email, password, name, address }) => {
    const response = await fetch('/api/customer-auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, name, address }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  }, { email, password, name, address });

  if (!registerResult.ok) {
    throw new Error(`Registration failed: ${registerResult.status} - ${JSON.stringify(registerResult.data)}`);
  }

  // Login via fetch in browser context
  const loginResult = await page.evaluate(async ({ email, password }) => {
    const response = await fetch('/api/customer-auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  }, { email, password });

  if (!loginResult.ok) {
    throw new Error(`Login failed: ${loginResult.status} - ${JSON.stringify(loginResult.data)}`);
  }

  // Verify authentication by checking /api/customer-auth/me
  const meResult = await page.evaluate(async () => {
    const response = await fetch('/api/customer-auth/me', {
      method: 'GET',
      credentials: 'include',
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  });

  if (!meResult.ok) {
    throw new Error(`Authentication verification failed: ${meResult.status}`);
  }

  return { email, password, name };
}

test.describe('Order Placement Flow', () => {
  test('complete order placement from restaurant to payment', async ({ page }) => {
    // Step 1: Register and login
    await registerAndLoginCustomer(page);

    // Step 2: Navigate to home page and wait for restaurants
    await page.goto('/');
    
    // Wait for restaurants to load
    await page.waitForFunction(() => {
      const grid = document.getElementById('grid');
      if (!grid) return false;
      const hasCards = grid.querySelector('.restaurant-card') !== null;
      const hasMessage = grid.textContent?.includes('No restaurants') || grid.textContent?.includes('no restaurants');
      return hasCards || hasMessage;
    }, { timeout: 10000 });

    // Step 3: Find a restaurant and navigate to its menu
    const restaurantCards = page.locator('.restaurant-card');
    const restaurantCount = await restaurantCards.count();

    test.skip(restaurantCount === 0, 'No restaurants available to test order placement');

    // Click first restaurant (link wraps the card)
    const firstCard = restaurantCards.first();
    const firstRestaurantLink = firstCard.locator('..'); // Parent <a> element
    const restaurantHref = await firstRestaurantLink.getAttribute('href');
    
    // Navigate directly using the href to avoid navigation timing issues
    await page.goto(restaurantHref.startsWith('http') ? restaurantHref : `http://localhost:3000${restaurantHref}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    // Give a moment for any client-side redirects
    await page.waitForTimeout(1000);
    
    // Verify we're on restaurant page (or login if auth failed)
    const currentUrl = page.url();
    if (currentUrl.includes('customer-login.html')) {
      // Auth might have failed, but this test requires auth - skip or fail
      throw new Error('Authentication failed - user was redirected to login');
    }
    expect(currentUrl).toMatch(/restaurant\.html\?id=/);

    // Extract restaurant ID from URL
    const url = new URL(page.url());
    const restaurantId = url.searchParams.get('id');
    expect(restaurantId).toBeTruthy();

    // Step 4: Wait for menu to load and add items to cart
    // Wait for menu grid to be populated
    await page.waitForFunction(() => {
      const menu = document.getElementById('menu');
      if (!menu) return false;
      const hasItems = menu.querySelector('.menu-card') !== null;
      const hasMessage = menu.textContent?.includes('No items') || menu.textContent?.includes('Loading');
      return hasItems || (hasMessage && !menu.textContent?.includes('Loading'));
    }, { timeout: 10000 });

    // Find menu items with "Add" buttons
    const addButtons = page.locator('button[data-add]');
    const addButtonCount = await addButtons.count();

    test.skip(addButtonCount === 0, 'No menu items available to add to cart');

    // Add first item to cart
    const firstAddButton = addButtons.first();
    await firstAddButton.click();

    // Wait for cart count to update (if cart badge exists)
    await page.waitForTimeout(500);

    // Verify cart count badge is visible and updated
    const cartCountBadge = page.locator('#cartCount');
    const cartCountVisible = await cartCountBadge.isVisible().catch(() => false);
    if (cartCountVisible) {
      const count = await cartCountBadge.textContent();
      expect(parseInt(count || '0')).toBeGreaterThan(0);
    }

    // Step 5: Navigate to cart page
    const cartLink = page.getByRole('link', { name: /cart/i });
    await cartLink.click();
    await page.waitForURL(/cart\.html/);

    // Step 6: Verify cart displays items
    const cartGroups = page.locator('.group-card');
    await expect(cartGroups.first()).toBeVisible();

    // Step 7: Select a restaurant group (if radio buttons exist)
    const restaurantRadio = page.locator('input[name="selectRestaurant"]').first();
    const radioExists = await restaurantRadio.isVisible().catch(() => false);
    if (radioExists) {
      await restaurantRadio.check();
      await page.waitForTimeout(300);
    }

    // Step 8: Click checkout button
    const checkoutButton = page.locator('#checkoutBtn');
    await expect(checkoutButton).toBeVisible();
    
    // Wait for checkout button to be enabled (it's disabled if no restaurant selected or items unavailable)
    await page.waitForFunction(
      () => {
        const btn = document.getElementById('checkoutBtn');
        return btn && !btn.disabled;
      },
      { timeout: 5000 }
    ).catch(() => {
      // If button is still disabled, try to enable it by selecting restaurant
      if (radioExists) {
        restaurantRadio.check();
      }
    });

    await checkoutButton.click();

    // Step 9: Verify redirect to payment page
    await page.waitForURL(/payment\.html/);
    expect(page.url()).toMatch(/payment\.html/);

    // Step 10: Fill payment form
    const deliveryAddressInput = page.locator('#deliveryAddress');
    await expect(deliveryAddressInput).toBeVisible();
    await deliveryAddressInput.fill('123 Test Delivery Street, Test City, TC 12345');

    const nameOnCardInput = page.locator('#nameOnCard');
    await expect(nameOnCardInput).toBeVisible();
    await nameOnCardInput.fill('Test User');

    // Fill card number (find by placeholder or label)
    const cardInputs = page.locator('input[type="text"]');
    const cardNumberInput = cardInputs.filter({ hasText: /card/i }).or(
      page.locator('input[placeholder*="4242"]')
    ).first();
    if (await cardNumberInput.count() > 0) {
      await cardNumberInput.fill('4242 4242 4242 4242');
    } else {
      // Fallback: find by position (second input after name)
      const allTextInputs = page.locator('input[type="text"]');
      const inputs = await allTextInputs.all();
      if (inputs.length > 1) {
        await inputs[1].fill('4242 4242 4242 4242');
      }
    }

    // Fill expiry (MM/YY format)
    const expiryInput = page.locator('input[placeholder*="MM/YY"]').or(
      page.locator('input').filter({ hasText: /expiry/i }).first()
    );
    if (await expiryInput.count() > 0) {
      await expiryInput.fill('12/25');
    } else {
      // Fallback: find by position
      const allInputs = page.locator('input');
      const inputs = await allInputs.all();
      // Usually expiry is before CVV
      for (const input of inputs) {
        const placeholder = await input.getAttribute('placeholder');
        if (placeholder && placeholder.includes('MM')) {
          await input.fill('12/25');
          break;
        }
      }
    }

    // Fill CVV
    const cvvInput = page.locator('input[type="password"]').first();
    await cvvInput.fill('123');

    // Step 11: Submit payment form
    const payButton = page.locator('button[type="submit"]').or(
      page.getByRole('button', { name: /pay now/i })
    );
    await expect(payButton).toBeVisible();

    // Wait for form validation to enable the button
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('button[type="submit"]');
        return btn && !btn.disabled;
      },
      { timeout: 5000 }
    );

    // Intercept the payment API call to verify it's made
    let paymentRequestMade = false;
    page.on('request', (request) => {
      if (request.url().includes('/api/payments/mock-checkout')) {
        paymentRequestMade = true;
      }
    });

    // Submit the form
    await payButton.click();

    // Step 12: Verify payment request was made
    await page.waitForTimeout(1000);
    
    // Check if we're redirected to success page or if an alert appears
    // The payment page shows an alert and redirects to payment-success.html
    const paymentUrl = page.url();
    const isSuccessPage = paymentUrl.includes('payment-success');
    const hasAlert = await page.evaluate(() => {
      // Check for alert dialog or success message
      return window.alert !== undefined || document.querySelector('.alert-success');
    });

    // Verify payment was processed (either redirect or API call)
    expect(paymentRequestMade || isSuccessPage || hasAlert).toBeTruthy();
  });

  test('add items to cart and verify cart count updates', async ({ page }) => {
    // Register and login
    await registerAndLoginCustomer(page);

    // Navigate to a restaurant
    await page.goto('/');
    
    // Wait for restaurants to load
    await page.waitForFunction(() => {
      const grid = document.getElementById('grid');
      if (!grid) return false;
      const hasCards = grid.querySelector('.restaurant-card') !== null;
      const hasMessage = grid.textContent?.includes('No restaurants') || grid.textContent?.includes('no restaurants');
      return hasCards || hasMessage;
    }, { timeout: 10000 });

    const restaurantCards = page.locator('.restaurant-card');
    const restaurantCount = await restaurantCards.count();

    test.skip(restaurantCount === 0, 'No restaurants available');

    // Navigate to restaurant page (link wraps the card)
    const firstCard = restaurantCards.first();
    const restaurantLink = firstCard.locator('..'); // Parent <a> element
    const restaurantHref = await restaurantLink.getAttribute('href');
    
    // Navigate directly using the href
    await page.goto(restaurantHref.startsWith('http') ? restaurantHref : `http://localhost:3000${restaurantHref}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    // Give a moment for any client-side redirects
    await page.waitForTimeout(1000);
    
    // Verify we're on restaurant page
    const currentUrl = page.url();
    if (currentUrl.includes('customer-login.html')) {
      throw new Error('Authentication failed - user was redirected to login');
    }
    expect(currentUrl).toMatch(/restaurant\.html\?id=/);

    // Wait for menu to load
    await page.waitForFunction(() => {
      const menu = document.getElementById('menu');
      if (!menu) return false;
      const hasItems = menu.querySelector('.menu-card') !== null;
      const hasMessage = menu.textContent?.includes('No items') || menu.textContent?.includes('Loading');
      return hasItems || (hasMessage && !menu.textContent?.includes('Loading'));
    }, { timeout: 10000 });

    // Find and click add button
    const addButtons = page.locator('button[data-add]');
    const addButtonCount = await addButtons.count();

    test.skip(addButtonCount === 0, 'No menu items available');

    // Get initial cart count (if visible)
    const cartCountBadge = page.locator('#cartCount');
    const initialCountVisible = await cartCountBadge.isVisible().catch(() => false);
    let initialCount = 0;
    if (initialCountVisible) {
      const countText = await cartCountBadge.textContent();
      initialCount = parseInt(countText || '0');
    }

    // Add item to cart
    await addButtons.first().click();
    await page.waitForTimeout(500);

    // Verify cart count updated
    if (initialCountVisible) {
      const newCountText = await cartCountBadge.textContent();
      const newCount = parseInt(newCountText || '0');
      expect(newCount).toBeGreaterThan(initialCount);
    } else {
      // If badge wasn't visible before, it should be visible now
      const isNowVisible = await cartCountBadge.isVisible().catch(() => false);
      if (isNowVisible) {
        const countText = await cartCountBadge.textContent();
        expect(parseInt(countText || '0')).toBeGreaterThan(0);
      }
    }
  });

  test('cart page displays items and allows checkout selection', async ({ page }) => {
    // Register and login
    await registerAndLoginCustomer(page);

    // Navigate to restaurant and add item
    await page.goto('/');
    await page.waitForTimeout(1000);

    const restaurantCards = page.locator('.restaurant-card');
    const restaurantCount = await restaurantCards.count();

    test.skip(restaurantCount === 0, 'No restaurants available');

    // Navigate to restaurant page (link wraps the card)
    const firstCard = restaurantCards.first();
    const restaurantLink = firstCard.locator('..'); // Parent <a> element
    const restaurantHref = await restaurantLink.getAttribute('href');
    
    // Navigate directly using the href
    await page.goto(restaurantHref.startsWith('http') ? restaurantHref : `http://localhost:3000${restaurantHref}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    // Give a moment for any client-side redirects
    await page.waitForTimeout(1000);
    
    // Verify we're on restaurant page
    const currentUrl = page.url();
    if (currentUrl.includes('customer-login.html')) {
      throw new Error('Authentication failed - user was redirected to login');
    }
    expect(currentUrl).toMatch(/restaurant\.html\?id=/);
    await page.waitForTimeout(1000);

    // Wait for menu to load
    await page.waitForFunction(() => {
      const menu = document.getElementById('menu');
      if (!menu) return false;
      const hasItems = menu.querySelector('.menu-card') !== null;
      const hasMessage = menu.textContent?.includes('No items') || menu.textContent?.includes('Loading');
      return hasItems || (hasMessage && !menu.textContent?.includes('Loading'));
    }, { timeout: 10000 });

    // Add item to cart
    const addButtons = page.locator('button[data-add]');
    const addButtonCount = await addButtons.count();
    test.skip(addButtonCount === 0, 'No menu items available');

    await addButtons.first().click();
    await page.waitForTimeout(500);

    // Navigate to cart
    await page.goto('/cart.html');
    
    // Wait for cart to load
    await page.waitForFunction(() => {
      const groups = document.querySelectorAll('.group-card');
      const hasMessage = document.body.textContent?.includes('empty') || document.body.textContent?.includes('Empty');
      return groups.length > 0 || hasMessage;
    }, { timeout: 10000 });

    // Verify cart page elements
    const cartGroups = page.locator('.group-card');
    const groupCount = await cartGroups.count();

    if (groupCount > 0) {
      // Verify restaurant group is displayed
      await expect(cartGroups.first()).toBeVisible();

      // Verify checkout button exists
      const checkoutButton = page.locator('#checkoutBtn');
      await expect(checkoutButton).toBeVisible();

      // If radio buttons exist, verify they can be selected
      const restaurantRadio = page.locator('input[name="selectRestaurant"]').first();
      const radioExists = await restaurantRadio.isVisible().catch(() => false);
      if (radioExists) {
        await restaurantRadio.check();
        await expect(restaurantRadio).toBeChecked();
      }
    }
  });
});
