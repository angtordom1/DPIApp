// Toasts stay on screen for seconds: a check must look at the toast its own action raised, not at
// an older one with the same text. Toasts already shown are marked before acting.
const expectToast = (action, text) => {
  cy.get('body').then(($body) => $body.find('.p-toast-message').attr('data-seen', '1'))
  action()
  cy.get('.p-toast-message:not([data-seen])').should('contain', text)
}

// the account "should register" creates and "Full flow" verifies and uses
const newUser = { username: 'usuario1', email: 'usuario1@example.com', password: 'badPassword' }

describe('Log in tests', () => {

  it('renders page correctly', () => {
    cy.visit('/')
    cy.location('pathname').should('eq', '/login')

    cy.get('body').should('contain','¡Bienvenido!').and('contain','Inicie sesión para continuar').and('contain','Sobre la página')
    cy.get('#username1').should('be.visible').and('have.value','').and('be.focused')
    cy.get('#password1 input').should('be.visible').and('have.value','')
    cy.get('#btLogin').should('be.visible').and('contain','Iniciar sesión')
    cy.get('#btSignin').should('be.visible').and('contain','Registrarse')
  })

  it('should not log in', () => {
    const login = () => cy.get('#btLogin').click()

    expectToast(login, 'Por favor, introduzca los datos para iniciar sesión')

    cy.get('#username1').type('fakeusername').should('have.value','fakeusername')
    expectToast(login, 'Por favor, introduzca los datos para iniciar sesión')

    cy.get('#username1').clear().should('have.value','')
    cy.get('#password1 input').type('fakepassword').should('have.value','fakepassword')
    expectToast(login, 'Por favor, introduzca los datos para iniciar sesión')

    cy.get('#username1').type('fakeusername')
    expectToast(login, 'Usuario o contraseña incorrectos')

    // the real test user with a wrong password: same message as an unknown user
    cy.get('#username1').clear().type(Cypress.env('USERTEST_USERNAME'))
    expectToast(login, 'Usuario o contraseña incorrectos')

    cy.get('#username1').clear().type('notValidUser')
    cy.get('#password1 input').clear().type('test')
    expectToast(login, '¡Debe validar la cuenta con el correo de confirmación!')
  })

  it('should log in with Enter', () => {
    cy.get('#username1').clear().type(Cypress.env('USERTEST_USERNAME'))
    cy.get('#password1 input').clear().type(`${Cypress.env('USERTEST_PASSWORD')}{enter}`, { log: false })

    // assert main page is rendered
    cy.location('pathname').should('eq', '/')
    cy.get('.layout-topbar').should('contain','DPIAPP').and('contain',Cypress.env('USERTEST_USERNAME')).and('have.descendants','button')
  })

  it('should log out', () => {
    // click on logout button
    cy.get('#btUsuario').click()
    cy.get('.p-menu').should('be.visible').and('contain','Cerrar sesión')
    cy.contains('.p-menuitem', 'Cerrar sesión').click()

    // assert popup is rendered
    cy.get('.p-dialog-mask').should('be.visible').and('contain','¿Seguro que desea salir?')
    cy.get('.p-dialog-mask').contains('button', 'No').should('be.visible').and('not.be.disabled').and('be.focused')
    cy.get('.p-dialog-mask').contains('button', 'Sí').should('be.visible').and('not.be.disabled')

    // assert no logout when click cancel button
    cy.get('.p-dialog-mask').contains('button', 'No').click()
    cy.location('pathname').should('eq', '/')
    cy.get('.p-dialog-mask').should('not.exist')

    // assert logout when click yes button
    cy.get('#btUsuario').click()
    cy.contains('.p-menuitem', 'Cerrar sesión').click()
    cy.get('.p-dialog-mask').contains('button', 'Sí').click()
    cy.location('pathname').should('eq', '/login')
    cy.get('.p-dialog-mask').should('not.exist')
  })

})


describe('Sign in tests', () => {

  it('should redirect to the register form', () => {
    cy.visit('/')
    cy.location('pathname').should('eq', '/login')
    cy.get('#btSignin').click()
    cy.location('pathname').should('eq', '/register')
  })

  it('should render register form', () => {
    cy.get('body').should('contain','Registro').and('contain','Sobre la página')

    // assert there are 4 inputs and 2 buttons
    cy.get('form').children('.field').should('have.length', 4)
    cy.get('form').children('button').should('have.length', 2)

    // assert there is 1 register button and 1 back button
    cy.contains('button', 'Registrarse').should('be.visible').and('not.be.disabled')
    cy.contains('button', 'Volver').should('be.visible').and('not.be.disabled')

    // assert fields have labels
    cy.get('.field').should('contain', 'Usuario').and('contain','Email').and('contain','Contraseña').and('contain','Verificar contraseña')

    // assert fields inputs are ok
    cy.get('#username1').should('be.visible').and('have.value','').and('be.focused')
    cy.get('#email1').should('be.visible').and('have.value','')
    cy.get('#password1 input').should('be.visible').and('have.value','')
    cy.get('#password2 input').should('be.visible').and('have.value','')
  })

  it('should not register', () => {
    const register = () => cy.contains('button', 'Registrarse').click()
    const invalidUsername = 'El usuario debe tener entre 4 y 20 caracteres'

    // no input filled
    expectToast(register, 'Por favor, introduzca los datos para registrarse')

    // username already used (answered by the API)
    cy.get('#username1').type(Cypress.env('USERTEST_USERNAME'))
    cy.get('#email1').type('bad.email@example.com')
    cy.get('#password1 input').type('badPassword')
    // PrimeVue texts come from the Spanish locale (lowercase + uppercase, 6+ characters = medium)
    cy.get('.p-password-info').should('have.text', 'Media')
    cy.get('#password2 input').type('badPassword')
    expectToast(register, 'Este nombre de usuario ya está siendo utilizado')

    // username not valid
    cy.get('#username1').clear().type('1234')
    expectToast(register, invalidUsername)
    cy.get('#username1').clear().type('12')
    expectToast(register, invalidUsername)
    cy.get('#username1').clear().type('a'.repeat(21))
    expectToast(register, invalidUsername)

    // reserved names (exact, any case); other names containing them are fine
    cy.get('#username1').clear().type('Admin')
    expectToast(register, 'Nombre de usuario no permitido')
    cy.get('#username1').clear().type('test')
    expectToast(register, 'Nombre de usuario no permitido')

    // email already used (answered by the API)
    cy.get('#username1').clear().type('fakeUsername')
    cy.get('#email1').clear().type('not.valid@example.com')
    expectToast(register, 'Este correo ya está siendo utilizado')

    // email not valid
    cy.get('#email1').clear().type('fakeEmail')
    expectToast(register, 'Debe ser un correo válido')
    cy.get('#email1').clear().type('a@example.com, b@example.com')
    expectToast(register, 'Debe ser un correo válido')

    // password too short
    cy.get('#email1').clear().type('bad.email@example.com')
    cy.get('#password1 input').clear().type('short')
    cy.get('#password2 input').clear().type('short')
    expectToast(register, 'La contraseña debe tener entre 8 y 72 caracteres')

    // passwords not matching
    cy.get('#password1 input').clear().type('badPassword')
    cy.get('#password2 input').clear().type('badPassword2')
    expectToast(register, 'Las contraseñas deben coincidir')
  })

  it('should register', () => {
    cy.get('#username1').clear().type(newUser.username)
    cy.get('#email1').clear().type(newUser.email)
    cy.get('#password1 input').clear().type(newUser.password)
    cy.get('#password2 input').clear().type(`${newUser.password}{enter}`)

    cy.location('pathname').should('eq', '/login')

    cy.get('.p-dialog').should('contain.text','Se ha enviado un correo de confirmación a su cuenta de correo. Para poder usar su cuenta, debe confirmar el mensaje enviado.')
    cy.get('.p-dialog-footer').find('.p-button-success').should('contain.text','Confirmar').and('be.focused').click()

    cy.get('.p-dialog').should('not.exist')
    cy.location('pathname').should('eq', '/login')
  })

})


describe('Full flow', () => {

  // leave no verified account with a known password behind
  after(() => {
    cy.request({ method: 'POST', url: '/api/login', body: { username: newUser.username, password: newUser.password }, failOnStatusCode: false })
      .then((res) => {
        if (res.status !== 200) return
        cy.request({ method: 'DELETE', url: `/api/users/${newUser.username}`, headers: { token: res.body.token } })
      })
    // only this test's emails: the inbox may hold someone else's
    cy.request(`${Cypress.env('MAILPIT_URL')}/api/v1/search?query=to:${newUser.email}`).then((search) => {
      const IDs = search.body.messages.map((message) => message.ID)
      if (IDs.length) cy.request({ method: 'DELETE', url: `${Cypress.env('MAILPIT_URL')}/api/v1/messages`, body: { IDs } })
    })
  })

  it('should verify the account from the email, log in and detect people', () => {
    // the verification email sent to the account registered above, caught by Mailpit
    cy.request(`${Cypress.env('MAILPIT_URL')}/api/v1/search?query=to:${newUser.email}`).then((search) => {
      expect(search.body.messages, 'verification email').to.have.length.greaterThan(0)
      return cy.request(`${Cypress.env('MAILPIT_URL')}/api/v1/message/${search.body.messages[0].ID}`)
    }).then((message) => {
      // keep only the path: the link points at the public URL, the tests may reach the app elsewhere
      const link = message.body.HTML.match(/href="[^"]*(\/api\/users\/verify\/[^"]+)"/)[1]
      return cy.request({ url: link, followRedirect: false })
    }).then((verify) => {
      expect(verify.status).to.equal(302)
      expect(verify.redirectedToUrl).to.match(/\/login$/)
    })
    cy.visit('/login')

    cy.get('#username1').type(newUser.username)
    cy.get('#password1 input').type(newUser.password, { log: false })
    cy.get('#btLogin').click()
    cy.get('.layout-topbar').should('contain', newUser.username)

    // sample image + the fastest model
    cy.contains('Seleccionar una imagen de prueba').click()
    cy.get('.p-dropdown').first().click()
    cy.contains('.p-dropdown-item', 'Imagen 5').click()
    // a light thumbnail, not the 1.2 MB original
    cy.get('.p-image img').should('have.attr', 'src', 'images/thumbs/youtube_V0000_I0006800.jpg')
    cy.get('#modelos').click()
    cy.contains('.p-dropdown-item', 'Faster R-CNN R50-FPN').click()
    cy.get('#button').should('not.be.disabled').click()

    // full-resolution CPU inference takes a few seconds
    cy.get('.p-dialog', { timeout: 120000 }).should('contain', 'Imagen resultante usando')
    cy.get('.p-dialog img').should('have.attr', 'src').and('match', /^data:image\/jpeg;base64,/)

    // zoom viewer: opens fitted, zooms in with the buttons and the keyboard, pans, and fits again
    cy.get('.zoom-level').invoke('text').then((fitted) => {
      cy.get('[aria-label="Ampliar"]').click().click()
      cy.get('.zoom-level').should(($level) => expect(parseInt($level.text())).to.be.greaterThan(parseInt(fitted)))
      cy.contains('.zoom-toolbar button', '100 %').click()
      cy.get('.zoom-level').should('have.text', '100 %')
      cy.get('.zoom-stage img').invoke('attr', 'style').then((before) => {
        cy.get('.zoom-stage').focus().type('{rightarrow}{downarrow}')
        cy.get('.zoom-stage img').should('not.have.attr', 'style', before)
      })
      cy.get('.zoom-stage').type('0')
      cy.get('.zoom-level').should('have.text', fitted)
    })

    // "Volver" only closes the result: no reload, the form keeps its choices for another search
    cy.contains('.p-dialog button', 'Volver').click()
    cy.get('.p-dialog').should('not.exist')
    cy.get('.p-dropdown').first().should('contain', 'Imagen 5')
    cy.get('#button').should('not.be.disabled')
    // and another sample can be chosen
    cy.get('.p-dropdown').first().click()
    cy.contains('.p-dropdown-item', 'Imagen 2').click()
    cy.get('.p-dropdown').first().should('contain', 'Imagen 2')

    // own image (2nd and last inference of the minute's quota)
    cy.contains('Subir una imagen').click()
    // something that is not an image: rejected in Spanish, nothing to search with
    cy.get('#FileUpload input[type=file]').selectFile('tests/e2e/cypress/fixtures/example.json', { force: true })
    cy.get('#FileUpload .p-message').should('contain', 'example.json: solo se admiten imágenes JPG o PNG')
    cy.get('#button').should('be.disabled')
    // a PNG, so the whole path (picker, Express, Flask) is checked for both formats
    cy.get('#FileUpload input[type=file]').selectFile('tests/e2e/cypress/fixtures/aerial.png', { force: true })
    // no upload status badge (it would always read "Pendiente")
    cy.get('#FileUpload').should('contain', 'aerial.png').find('.p-badge').should('not.be.visible')
    cy.get('#button').should('not.be.disabled').click()
    cy.get('.p-dialog', { timeout: 120000 }).should('contain', 'Imagen resultante usando')
    cy.contains('.p-dialog button', 'Volver').click()

    // the file stays chosen for another search, and can be swapped for another one
    cy.get('#FileUpload').should('contain', 'aerial.png')
    cy.get('#button').should('not.be.disabled')
    cy.contains('#FileUpload button', 'Cancelar').click()
    cy.get('#button').should('be.disabled')
    cy.get('#FileUpload input[type=file]').should('not.be.disabled')
      .selectFile('tests/e2e/cypress/fixtures/aerial.jpg', { force: true })
    cy.get('#FileUpload').should('contain', 'aerial.jpg')
    cy.get('#button').should('not.be.disabled')
  })

})
