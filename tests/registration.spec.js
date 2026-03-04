const { test, expect } = require('@playwright/test');


class RegistrationPage {
    constructor(page) {
        this.page = page;
        
        // Locators
        this.firstName = page.getByPlaceholder('First Name');
        this.lastName = page.getByPlaceholder('Last Name');
        this.email = page.getByPlaceholder('name@example.com');
        this.mobile = page.getByPlaceholder('Mobile Number');
        this.dobInput = page.locator('#dateOfBirthInput');
        this.subjectsInput = page.locator('#subjectsInput');
        this.uploadPicture = page.locator('input[type="file"]');
        
        // Dropdowns & Buttons
        this.stateDropdown = page.locator('#state');
        this.cityDropdown = page.locator('#city');
        this.cityInputHidden = this.cityDropdown.locator('input'); // Used to check disabled state
        this.submitButton = page.locator('#submit');
        
        // Modal Elements
        this.modal = page.locator('.modal-content');
        this.modalHeader = this.modal.locator('.modal-header');
        this.modalTable = this.modal.locator('table');
        this.closeModalBtn = page.locator('#closeLargeModal');
    }

    // Actions
    async navigate() {
        await this.page.goto('https://demoqa.com/automation-practice-form');
    }

    async selectGender(gender) {
        // Clicks the label corresponding to the gender radio button
        await this.page.getByText(gender, { exact: true }).click();
    }

    async selectDateOfBirth(day, monthIndex, year) {
        await this.dobInput.click();
        await this.page.locator('.react-datepicker__month-select').selectOption(monthIndex);
        await this.page.locator('.react-datepicker__year-select').selectOption(year);
        // Formats the day to always be two digits
        const formattedDay = day.padStart(3, '0'); 
        await this.page.locator(`.react-datepicker__day--${formattedDay}`).first().click(); 
    }

    async addSubject(subject) {
        await this.subjectsInput.fill(subject);
        await this.page.locator('.subjects-auto-complete__menu').getByText(subject, { exact: true }).click();
    }
}


test.describe('Student Registration Form Functionality', () => {
    let registrationPage;

    test.beforeEach(async ({ page }) => {
        registrationPage = new RegistrationPage(page);
        await registrationPage.navigate();
    });

    // Acceptance Criteria 1 & 5 
    test('AC 1 & 5: Successfully submit the form with all valid data and verify modal', async ({ page }) => {
        // Fill out all valid data in the form 
        await registrationPage.firstName.fill('Somchai');
        await registrationPage.lastName.fill('Jaidee');
        await registrationPage.email.fill('somchai@example.com');
        await registrationPage.selectGender('Male');
        await registrationPage.mobile.fill('0812345678');
        
        await registrationPage.selectDateOfBirth('15', '5', '2000');
        
        await registrationPage.addSubject('Maths');
        await registrationPage.uploadPicture.setInputFiles('test.jpg'); 
        
        await registrationPage.stateDropdown.click();
        await page.getByText('NCR', { exact: true }).click();
        await registrationPage.cityDropdown.click();
        await page.getByText('Delhi', { exact: true }).click();
        
        // Submit the form
        await registrationPage.submitButton.click();

        // Verify success modal appears 
        await expect(registrationPage.modal).toBeVisible();
        await expect(registrationPage.modalHeader).toHaveText('Thanks for submitting the form');

        // Verify the modal correctly displays the exact data entered 
        await expect(registrationPage.modalTable.locator('tr:has-text("Student Name")')).toContainText('Somchai Jaidee');
        await expect(registrationPage.modalTable.locator('tr:has-text("Student Email")')).toContainText('somchai@example.com');
        await expect(registrationPage.modalTable.locator('tr:has-text("Gender")')).toContainText('Male');
        await expect(registrationPage.modalTable.locator('tr:has-text("Mobile")')).toContainText('0812345678');
        await expect(registrationPage.modalTable.locator('tr:has-text("Subjects")')).toContainText('Maths');
        await expect(registrationPage.modalTable.locator('tr:has-text("State and City")')).toContainText('NCR Delhi');

        
        await registrationPage.closeModalBtn.click();
    });

    // Acceptance Criteria 2 
    test('AC 2: Form cannot be submitted if mandatory fields are blank', async () => {
        // Leave First Name, Last Name, Gender, Mobile blank and click submit
        await registrationPage.submitButton.click();

        // Verify client-side validation triggers (indicated by red border on required fields) 
        await expect(registrationPage.firstName).toHaveCSS('border-color', 'rgb(220, 53, 69)');
        await expect(registrationPage.lastName).toHaveCSS('border-color', 'rgb(220, 53, 69)');
        await expect(registrationPage.mobile).toHaveCSS('border-color', 'rgb(220, 53, 69)');
    });

    // Acceptance Criteria 3 & 7 
    test('AC 3 & 7: "City" dropdown dependency on "State"', async ({ page }) => {
        const dropdownMenu = page.locator('[class$="-menu"]');

        // Verify City dropdown is disabled until a State is selected
        await expect(registrationPage.cityInputHidden).toBeDisabled(); 

        // Select a State (NCR)
        await registrationPage.stateDropdown.click();
        await page.getByText('NCR', { exact: true }).click();

        // Verify City is now enabled
        await expect(registrationPage.cityInputHidden).toBeEnabled();

        // Verify City options are filtered based on selected State
        await registrationPage.cityDropdown.click();
        await expect(dropdownMenu).toContainText('Delhi');
        await expect(dropdownMenu).toContainText('Gurgaon');
        await expect(dropdownMenu).toContainText('Noida');
        
        // Close menu to proceed
        await dropdownMenu.getByText('Delhi', { exact: true }).click();

        // Change State to a different one (Uttar Pradesh) 
        await registrationPage.stateDropdown.click();
        await page.getByText('Uttar Pradesh', { exact: true }).click();

        // Verify City options updated to the new state's cities 
        await registrationPage.cityDropdown.click();
        await expect(dropdownMenu).not.toContainText('Delhi'); 
        await expect(dropdownMenu).toContainText('Agra');
        await expect(dropdownMenu).toContainText('Lucknow');
    });

    // Acceptance Criteria 4 
    test('AC 4: "Subjects" allows multiple entries and displays removable tags', async ({ page }) => {
        // Add multiple entries to the Subjects field 
        await registrationPage.addSubject('Maths');
        await registrationPage.addSubject('Physics');

        // Locate the tags using the stable component class
        const mathTagWrapper = page.locator('.subjects-auto-complete__multi-value').filter({ hasText: 'Maths' });
        const physicsTagWrapper = page.locator('.subjects-auto-complete__multi-value').filter({ hasText: 'Physics' });
        
        // Verify tags are displayed 
        await expect(mathTagWrapper).toBeVisible();
        await expect(physicsTagWrapper).toBeVisible();

        // Verify tags are removable 
        const removeMathBtn = mathTagWrapper.locator('.subjects-auto-complete__multi-value__remove'); 
        await removeMathBtn.click();

        // Verify Maths is removed, but Physics remains
        await expect(mathTagWrapper).toBeHidden();
        await expect(physicsTagWrapper).toBeVisible();
    });

    // Acceptance Criteria 6 
    test('AC 6: Field Validation for Mobile, Email, and Date of Birth', async () => {
        // Verify field defaults to current system date 
        const defaultDob = await registrationPage.dobInput.inputValue();
        expect(defaultDob).not.toBe(''); 

        // Verify manual selection via calendar widget 
        await registrationPage.selectDateOfBirth('1', '0', '2000'); // 0 = Jan
        await expect(registrationPage.dobInput).toHaveValue('01 Jan 2000');

        // Must be exactly 10 digits
        await registrationPage.mobile.fill('12345'); // Invalid length
        await registrationPage.submitButton.click();
        await expect(registrationPage.mobile).toHaveCSS('border-color', 'rgb(220, 53, 69)'); 

        // Must contain @ and a valid domain extension 
        await registrationPage.email.fill('invalidemail.com'); // Missing @
        await registrationPage.submitButton.click();
        await expect(registrationPage.email).toHaveCSS('border-color', 'rgb(220, 53, 69)'); 
    });
});