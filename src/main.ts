type AppElements = {
  input: HTMLInputElement,
  form: HTMLFormElement,
  button: HTMLButtonElement,
  commentsContainer: HTMLDivElement
}

class App {
  currentUser: User;
  messageCounter: number = 0;
  users: Array<User>;
  comments: Array<Commentary> = [];

  // Find all HTML elements
  elements: AppElements= {
    input: document.getElementById('comment-input') as HTMLInputElement,
    form: document.getElementById('comment-form') as HTMLFormElement,
    button: document.querySelector('#comment-form button') as HTMLButtonElement,
    commentsContainer: document.getElementById('comments-container') as HTMLDivElement,
  };

  constructor(users: Array<User>) {
    this.users = users;
    this.currentUser = users[0];
    this.renderUserList();

    this.elements.input.oninput = (e) => {
      const el = e.currentTarget as HTMLInputElement;
      console.log('==> ', el.value);

      // Disable/enable button
      if (el.value.length > 0) {
        this.elements.button.removeAttribute('disabled');
      } else {
        this.elements.button.setAttribute('disabled', 'on');
      }
    };

    this.elements.form.onsubmit = (e) => {
      e.preventDefault();

      const newComment = new Commentary(this.elements.input.value, this.currentUser);
      this.comments.push(newComment);
      const commentElement = newComment.getHTMLElement();

      this.elements.input.value = '';
      this.elements.button.setAttribute('disabled', '')
      this.elements.commentsContainer.appendChild(commentElement);
    }
  }

  renderUserList() {
    const userList = document.getElementById('user-list')!;

    userList.innerHTML = '';

    for (let i = 0; i < this.users.length; i++){
      const user = this.users[i];

      const userElement = createElementFromString(`
        <div class="user ${user.id === this.currentUser.id ? 'active' : ''}" data-user-id="${user.id}">
            <img src="./images/${user.avatar}" width="30" height="30">
            <span>${user.name}</span>
        </div>
      `) as HTMLDivElement;

      userElement.onclick = () => {
        this.currentUser = user;
        this.renderUserList();
      };

      userList.appendChild(userElement);
    }
  }
}

class User {
  id: number;
  name: string;
  avatar: string;
  comments: Array<Commentary> = [];

  constructor(id: number, name: string, avatar: string) {
    this.id = id;
    this.name = name;
    this.avatar = avatar;
  }

  addComment(comment: Commentary) {
    this.comments.push(comment);
  }
}

class Commentary {
  author: User;
  timestamp: Date;
  text: string;
  parent?: Commentary;
  child?: Commentary;
  favorite: boolean = false;
  likes: number = 0;

  constructor(text: string, author: User, parent?: Commentary, child?: Commentary) {
    this.text = text;
    this.author = author;
    this.timestamp = new Date();
    this.parent = parent;
    this.child = child;
  }

  getTemplate() {
    return `
      <div class="comment">
          <div class="comment-intrinsic">
              <img class="avatar" alt="" src="./images/${this.author.avatar}">
              <div>
                  <div class="heading">
                      <span class="user-name">${this.author.name}</span>
                      <span class="date">${this.timestamp}</span>
                  </div>
                  <p>${this.text}</p>
                  <div class="actions">
                      <a href="#" class="action-respond">
                          <img src="./images/reply.svg">
                          <span class="reply">Ответить</span>
                      </a>
                      <a href="#" class="action-favorite">
                          <img src="./images/heart_icon.svg">
                          <span class="favorite">В избранном</span>
                      </a>
                      <div class="minus">-</div>
                      <span class="likes-counter">${this.likes}</span>
                      <div class="plus">+</div>
                  </div>
              </div>
          </div>
        </div>
    `;
  }

  getHTMLElement() {
    const stringHtml = this.getTemplate();
    const element = createElementFromString(stringHtml) as HTMLDivElement;

    return element;
  }
}

function createElementFromString(htmlString: string) {
  const parser = new DOMParser();
  return parser.parseFromString(htmlString, "text/html").body.firstChild;
}