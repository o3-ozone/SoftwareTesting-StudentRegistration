const { test, expect } = require('@playwright/test');

class RegistrationPage {
    constructor(page) {
        this.page = page;

        // Form fields
        this.firstName = page.getByPlaceholder('First Name');
        this.lastName = page.getByPlaceholder('Last Name');
        this.email = page.getByPlaceholder('name@example.com');
        this.mobile = page.getByPlaceholder('Mobile Number');
        this.dobInput = page.locator('#dateOfBirthInput');
        this.subjectsInput = page.locator('#subjectsInput');
        this.uploadPicture = page.locator('input[type="file"]');

        // Dropdown
        this.stateDropdown = page.locator('#state');
        this.cityDropdown = page.locator('#city');
        this.cityInputHidden = this.cityDropdown.locator('input');

        // Button
        this.submitButton = page.locator('#submit');

        // Modal
        this.modal = page.locator('.modal-content');
        this.modalHeader = this.modal.locator('.modal-header');
        this.modalTable = this.modal.locator('table');
        this.closeModalBtn = page.locator('#closeLargeModal');
    }

    async navigate() {
        await this.page.goto('https://demoqa.com/automation-practice-form');
    }

    async selectGender(gender) {
        // DemoQA uses a specific structure for radio buttons, clicking the label is safer
        await this.page.locator(`label[for="gender-radio-${gender === 'Male' ? '1' : gender === 'Female' ? '2' : '3'}"]`).click();
    }

    async selectDateOfBirth(day, monthIndex, year) {
        await this.dobInput.click();
        await this.page.locator('.react-datepicker__month-select').selectOption(monthIndex);
        await this.page.locator('.react-datepicker__year-select').selectOption(year);
        
        // Ensure day format has no leading zero for DemoQA's selector
        await this.page.locator(`.react-datepicker__day--0${day.padStart(2, '0')}`).first().click();
    }

    async addSubject(subject) {
        await this.subjectsInput.fill(subject);
        await this.page.locator('.subjects-auto-complete__menu').getByText(subject, { exact: true }).click();
    }

    async clickSubmit() {
        // Scroll into view to prevent Ad banners from blocking the click
        await this.submitButton.scrollIntoViewIfNeeded();
        await this.submitButton.click({ force: true });
    }
}

test.describe('Student Registration Form Tests', () => {

    let registrationPage;

    test.beforeEach(async ({ page }) => {
        registrationPage = new RegistrationPage(page);
        await registrationPage.navigate();
    });

    /*
    AC1: Verify that a user can successfully submit the form with valid data
    Technique: Equivalence Partitioning 
    */
    test('AC1: Successful form submission', async ({ page }) => {
        await registrationPage.firstName.fill('Somchai');
        await registrationPage.lastName.fill('Jaidee');
        await registrationPage.email.fill('somchai@example.com');
        await registrationPage.selectGender('Male');
        await registrationPage.mobile.fill('0812345678');
        
        await registrationPage.selectDateOfBirth('14', '1', '2000');

        await registrationPage.addSubject('Maths');

        await registrationPage.stateDropdown.click();
        await page.getByText('NCR', { exact: true }).click();
        await registrationPage.cityDropdown.click();
        await page.getByText('Delhi', { exact: true }).click();

        await registrationPage.clickSubmit();

        await expect(registrationPage.modal).toBeVisible();
        await expect(registrationPage.modalHeader).toHaveText('Thanks for submitting the form');
    });

    /*
    AC2: Mandatory fields must not be empty (First Name, Last Name, Gender, Mobile)
    Technique: Decision Table Testing
    */
    const decisionTable = [
        { testName: 'Missing First Name', fName: '', lName: 'Jaidee', gender: 'Male', mobile: '0812345678', errorFields: ['firstName'] },
        { testName: 'Missing Last Name', fName: 'Somchai', lName: '', gender: 'Male', mobile: '0812345678', errorFields: ['lastName'] },
        { testName: 'Missing Mobile', fName: 'Somchai', lName: 'Jaidee', gender: 'Male', mobile: '', errorFields: ['mobile'] },
        { testName: 'Missing Gender', fName: 'Somchai', lName: 'Jaidee', gender: '', mobile: '0812345678', errorFields: ['gender'] },
        { testName: 'All Blank', fName: '', lName: '', gender: '', mobile: '', errorFields: ['firstName', 'lastName', 'mobile', 'gender'] }
    ];

    for (const record of decisionTable) {
        test(`AC2 (Decision Table): Form cannot be submitted - ${record.testName}`, async ({ page }) => {
            if (record.fName) await registrationPage.firstName.fill(record.fName);
            if (record.lName) await registrationPage.lastName.fill(record.lName);
            if (record.gender) await registrationPage.selectGender(record.gender);
            if (record.mobile) await registrationPage.mobile.fill(record.mobile);

            await registrationPage.clickSubmit();

            await expect(registrationPage.modal).not.toBeVisible();

            // วนลูปตรวจสอบ UI การแจ้งเตือน Error ทุกฟิลด์ที่พัง
            for (const field of record.errorFields) {
                if (field === 'gender') {
                    await expect(page.locator('label[for="gender-radio-1"]'))
                        .toHaveCSS('color', 'rgb(220, 53, 69)');
                } else {
                    await expect(registrationPage[field])
                        .toHaveCSS('border-color', 'rgb(220, 53, 69)');
                }
            }
        });
    }

    /*
    AC3 & AC7: City dropdown changes based on State, disabled until state selected
    Technique: State Transition Testing
    */
    test('AC3 & AC7: City dropdown state transitions', async ({ page }) => {
        // State 1: Before State is selected -> City is disabled
        await expect(registrationPage.cityInputHidden).toBeDisabled();

        // State 2: Select State -> City becomes enabled and options change
        await registrationPage.stateDropdown.click();
        await page.getByText('NCR', { exact: true }).click();

        await registrationPage.cityDropdown.click();
        const dropdownMenu = page.locator('[class$="-menu"]');
        await expect(dropdownMenu).toContainText('Delhi');
        await expect(dropdownMenu).toContainText('Gurgaon');
    });

    //AC4: Subjects allow multiple entries
    test('AC4: Subjects allow multiple tags', async ({ page }) => {
        await registrationPage.addSubject('Maths');
        await registrationPage.addSubject('Physics');

        const mathTag = page.locator('.subjects-auto-complete__multi-value').filter({ hasText: 'Maths' });
        const physicsTag = page.locator('.subjects-auto-complete__multi-value').filter({ hasText: 'Physics' });

        await expect(mathTag).toBeVisible();
        await expect(physicsTag).toBeVisible();
    });

    /*
    AC5: Submission modal must show exact data
    Technique: Statement Coverage 
    */
    test('AC5: Modal displays correct submitted data', async ({ page }) => {
        await registrationPage.firstName.fill('Somchai');
        await registrationPage.lastName.fill('Jaidee');
        await registrationPage.email.fill('somchai@example.com');
        await registrationPage.selectGender('Male');
        await registrationPage.mobile.fill('0812345678');
        
        await registrationPage.stateDropdown.click();
        await page.getByText('NCR', { exact: true }).click();
        await registrationPage.cityDropdown.click();
        await page.getByText('Delhi', { exact: true }).click();

        await registrationPage.clickSubmit();

        await expect(registrationPage.modalTable.locator('tr:has-text("Student Name")'))
            .toContainText('Somchai Jaidee');
        await expect(registrationPage.modalTable.locator('tr:has-text("Student Email")'))
            .toContainText('somchai@example.com');
        await expect(registrationPage.modalTable.locator('tr:has-text("Gender")'))
            .toContainText('Male');
        await expect(registrationPage.modalTable.locator('tr:has-text("Mobile")'))
            .toContainText('0812345678');
        await expect(registrationPage.modalTable.locator('tr:has-text("State and City")'))
            .toContainText('NCR Delhi');
    });

    /*
    AC6.1: Mobile Validation
    Techniques: Boundary Value Testing & Equivalence Partitioning
    */
    test('AC6.1: Mobile Validation (Boundary & Equivalence)', async () => {
        // Boundary (Lower): 9 digits (Invalid)
        await registrationPage.mobile.fill('123456789');
        await registrationPage.clickSubmit();
        await expect(registrationPage.mobile).toHaveCSS('border-color', 'rgb(220, 53, 69)');

        // Boundary (Upper): 11 digits (Invalid)
        await registrationPage.mobile.clear();
        await registrationPage.mobile.fill('12345678901');
        await expect(registrationPage.mobile).toHaveValue('1234567890');

        // Equivalence Partitioning (Invalid): ตัวอักษรและสัญลักษณ์พิเศษ
        await registrationPage.mobile.clear();
        await registrationPage.mobile.fill('abcde!@#$');
        await registrationPage.clickSubmit(); 
        await expect(registrationPage.mobile).toHaveCSS('border-color', 'rgb(220, 53, 69)');

        // Boundary (Exact): 10 digits (Valid)
        await registrationPage.mobile.fill('1234567890');
        await expect(registrationPage.mobile).toHaveValue('1234567890');
    });

    /*
    AC6.2: Email Validation
    Technique: Equivalence Partitioning (Invalid & Valid Classes)
    */
    test('AC6.2: Email Validation (Equivalence Partitioning)', async () => {
        // Invalid: ไม่มี "@"
        await registrationPage.email.fill('invalidemail.com');
        await registrationPage.clickSubmit();
        await expect(registrationPage.email).toHaveCSS('border-color', 'rgb(220, 53, 69)');

        // Invalid: ไม่มี domain extension
        await registrationPage.email.clear();
        await registrationPage.email.fill('test@domain');
        await registrationPage.clickSubmit();
        await expect(registrationPage.email).toHaveCSS('border-color', 'rgb(220, 53, 69)');

        // Valid: รูปแบบถูกต้อง (name@example.com)
        await registrationPage.email.clear();
        await registrationPage.email.fill('test@example.com');
        await registrationPage.clickSubmit();
        await expect(registrationPage.email).not.toHaveCSS('border-color', 'rgb(220, 53, 69)');
    });

    /*
    AC6.3: Date of Birth Validation
    Technique: Functional Testing
    */
    test('AC6.3: Date of Birth defaults to current date and allows manual selection', async () => {
        // 1. ตรวจสอบ Default Value ว่าตรงกับ Current System Date หรือไม่
        const today = new Date();
        const day = today.getDate().toString().padStart(2, '0');
        const month = today.toLocaleString('en-US', { month: 'short' }); 
        const year = today.getFullYear();
        const expectedDefaultDate = `${day} ${month} ${year}`;

        await expect(registrationPage.dobInput).toHaveValue(expectedDefaultDate);

        // 2. ตรวจสอบว่าสามารถกดเลือกผ่าน Calendar Widget ได้
        await registrationPage.selectDateOfBirth('15', '5', '2000'); 
        await expect(registrationPage.dobInput).toHaveValue('15 Jun 2000');
    });

});