const { test, expect } = require('@playwright/test');

test.describe('Student Registration Form', () => {

  test.beforeEach(async ({ page }) => {
    // เปลี่ยน URL เป็นหน้าฟอร์มจริงที่คุณใช้ทดสอบ
    await page.goto('https://demoqa.com/automation-practice-form'); 
  });

  test('Should successfully submit the form with valid data', async ({ page }) => {
    await page.getByPlaceholder('First Name').fill('Somchai');
    await page.getByPlaceholder('Last Name').fill('Jaidee');
    
    await page.getByPlaceholder('name@example.com').fill('somchai@example.com'); 
    
    await page.locator('label[for="gender-radio-1"]').click(); 
    await page.getByPlaceholder('Mobile Number').fill('0812345678');

    const dobInput = page.locator('#dateOfBirthInput');
    await dobInput.click();
    await page.locator('.react-datepicker__month-select').selectOption('5'); // June
    await page.locator('.react-datepicker__year-select').selectOption('2000');
    await page.locator('.react-datepicker__day--015').click(); // 15th

    const subjectsInput = page.locator('#subjectsInput');
    await subjectsInput.fill('Math');
    await page.keyboard.press('Enter'); 
    await subjectsInput.fill('Physics');
    await page.keyboard.press('Enter'); 

    await page.setInputFiles('input[type="file"]', 'tests/test.jpg'); 

    await page.locator('#state').click();
    await page.locator('text=NCR').click();
    
    await page.locator('#city').click();
    await page.locator('text=Delhi').click(); 

    await page.locator('#submit').click();

    const modal = page.locator('.modal-content');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.modal-header')).toHaveText('Thanks for submitting the form');
    
    const tableBody = modal.locator('tbody');
    await expect(tableBody).toContainText('Somchai Jaidee');
    await expect(tableBody).toContainText('0812345678');

    await page.locator('#closeLargeModal').click();
  });

  test('Should not submit if mandatory fields are blank', async ({ page }) => {
    await page.locator('#submit').click();
    
    const firstNameInput = page.getByPlaceholder('First Name');
    await expect(firstNameInput).toHaveCSS('border-color', 'rgb(220, 53, 69)');
  });

});