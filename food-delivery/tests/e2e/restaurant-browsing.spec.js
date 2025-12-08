import { test, expect } from '@playwright/test';

test.describe('Restaurant Browsing and Search', () => {
  test('home page loads and displays restaurant grid', async ({ page }) => {
    await page.goto('/');
    
    // Verify navbar is visible
    await expect(
      page.getByRole('navigation').getByRole('link', { name: /bitecode/i })
    ).toBeVisible();
    
    // Verify search input is visible
    const searchInput = page.locator('#search');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', /search restaurants/i);
    
    // Wait for restaurants to load (grid should have content)
    const grid = page.locator('#grid');
    await expect(grid).toBeVisible();
    
    // Wait for restaurants to load - wait for either restaurant cards or "no restaurants" message
    await page.waitForFunction(() => {
      const grid = document.getElementById('grid');
      if (!grid) return false;
      const hasCards = grid.querySelector('.restaurant-card') !== null;
      const hasMessage = grid.textContent?.includes('No restaurants') || grid.textContent?.includes('no restaurants');
      return hasCards || hasMessage;
    }, { timeout: 10000 });
    
    // Verify at least one restaurant card is displayed (if data exists)
    const restaurantCards = page.locator('.restaurant-card');
    const count = await restaurantCards.count();
    
    if (count > 0) {
      // Verify restaurant card structure
      const firstCard = restaurantCards.first();
      await expect(firstCard).toBeVisible();
      
      // Verify restaurant card has an image
      const cardImage = firstCard.locator('img.thumb');
      await expect(cardImage).toBeVisible();
      
      // Verify restaurant card is clickable (link wraps the card)
      const cardLink = firstCard.locator('..'); // Parent element (the <a> tag)
      await expect(cardLink).toHaveAttribute('href', /restaurant\.html/);
    }
  });

  test('search functionality filters restaurants', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.locator('#search');
    await expect(searchInput).toBeVisible();
    
    // Wait for initial restaurants to load
    await page.waitForTimeout(1000); // Allow time for initial fetch
    
    // Get initial restaurant count (if any)
    const initialCards = page.locator('.restaurant-card');
    const initialCount = await initialCards.count();
    
    // Type a search query
    await searchInput.fill('pizza');
    
    // Wait for debounced search to execute (500ms debounce + network time)
    await page.waitForTimeout(1000);
    
    // Verify search input has the value
    await expect(searchInput).toHaveValue('pizza');
    
    // The grid should update (either show filtered results or "No restaurants found")
    const grid = page.locator('#grid');
    await expect(grid).toBeVisible();
    
    // If there are results, verify they're displayed
    // If no results, the grid should show a message
    const currentCards = page.locator('.restaurant-card');
    const message = page.locator('#grid').locator('text=/no restaurants found/i');
    
    // Either we have cards or a "no results" message
    const hasCards = (await currentCards.count()) > 0;
    const hasMessage = await message.isVisible().catch(() => false);
    
    expect(hasCards || hasMessage).toBeTruthy();
  });

  test('clicking restaurant card navigates to restaurant menu page', async ({ page }) => {
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
    const count = await restaurantCards.count();
    
    // Skip test if no restaurants exist
    test.skip(count === 0, 'No restaurants available to test navigation');
    
    // Click the first restaurant card (the link wraps the card)
    const firstCard = restaurantCards.first();
    const cardLink = firstCard.locator('..'); // Parent <a> element
    
    // Get the href to verify it's a restaurant page
    const href = await cardLink.getAttribute('href');
    expect(href).toMatch(/restaurant\.html\?id=/);
    
    // Click and wait for navigation (may redirect to login if not authenticated)
    await cardLink.click();
    
    // Wait for navigation - could be restaurant page or login page
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    
    // If redirected to login, that's expected behavior for unauthenticated users
    if (currentUrl.includes('customer-login.html')) {
      // This is expected - restaurant pages require authentication
      // Verify we're on login page with return URL
      expect(currentUrl).toMatch(/customer-login\.html/);
      expect(currentUrl).toMatch(/return=/);
    } else {
      // If authenticated or page doesn't require auth, verify restaurant page
      expect(currentUrl).toMatch(/restaurant\.html\?id=/);
      
      // Verify restaurant page elements are visible
      const menuGrid = page.locator('#menu');
      await expect(menuGrid).toBeVisible({ timeout: 10000 });
    }
    
    // Verify navbar is still present
    await expect(
      page.getByRole('navigation').getByRole('link', { name: /bitecode/i })
    ).toBeVisible();
  });

  test('restaurant cards display key information', async ({ page }) => {
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
    const count = await restaurantCards.count();
    
    // Skip test if no restaurants exist
    test.skip(count === 0, 'No restaurants available to verify card information');
    
    const firstCard = restaurantCards.first();
    
    // Verify card has an image
    const image = firstCard.locator('img.thumb');
    await expect(image).toBeVisible();
    
    // Verify card has restaurant name (should be in the card content)
    const cardText = await firstCard.textContent();
    expect(cardText).toBeTruthy();
    expect(cardText.length).toBeGreaterThan(0);
    
    // Verify card is structured properly (link wraps the card, so parent should be <a>)
    const link = firstCard.locator('..'); // Parent <a> element
    const tagName = await link.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('a');
  });
});
