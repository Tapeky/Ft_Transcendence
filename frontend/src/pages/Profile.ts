import { authManager } from '../auth/AuthManager';
import { router } from '../router';
import { Header } from '../components/vanilla/Header';
import { BackBtn } from '../components/vanilla/BackBtn';

export class ProfilePage {
  private element: HTMLElement;
  private header?: Header;
  private backBtn?: BackBtn;

  constructor() {
    this.element = this.createElement();
  }

  private createElement(): HTMLElement {
    // Main container with React exact styling
    const container = document.createElement('div');
    container.className = 'min-h-screen min-w-[1000px] box-border flex flex-col m-0 font-iceland select-none gap-8 bg-blue-900 text-white';

    const user = authManager.getCurrentUser();

    // Create Header component (like React)
    this.header = new Header(true);
    container.appendChild(this.header.getElement());

    // Center container with React exact gradient and borders
    const centerContainer = document.createElement('div');
    centerContainer.className = 'w-[1300px] flex-grow bg-gradient-to-b from-pink-800 to-purple-600 self-center border-x-4 border-t-4 flex flex-col p-4 overflow-auto';

    // Header section with BackBtn (React exact)
    const headerSection = document.createElement('div');
    headerSection.className = 'text-center text-[4rem] border-b-2 w-full flex';

    // Create BackBtn component
    this.backBtn = new BackBtn();
    headerSection.appendChild(this.backBtn.getElement());

    // Title (React exact)
    const title = document.createElement('h1');
    title.className = 'flex-1';
    title.textContent = 'Profile';
    headerSection.appendChild(title);

    // Right spacer (React exact)
    const rightSpacer = document.createElement('div');
    rightSpacer.className = 'flex-1';
    headerSection.appendChild(rightSpacer);

    centerContainer.appendChild(headerSection);

    // Main content layout (React exact 2-columns)
    const mainContent = document.createElement('div');
    mainContent.className = 'flex m-10 flex-grow';

    // Left column: User info + forms (React exact)
    const leftColumn = document.createElement('div');
    leftColumn.className = 'flex flex-col flex-[1.5] text-[2rem] gap-10';

    // Username section (React exact)
    const usernameSection = document.createElement('div');
    usernameSection.className = 'flex gap-[9.5rem]';
    usernameSection.innerHTML = `
      <h4>Username</h4>
      <h2>${user?.username || 'User'}</h2>
    `;
    leftColumn.appendChild(usernameSection);

    // Display Name section (placeholder - will be component)
    const displayNameSection = document.createElement('div');
    displayNameSection.className = 'flex justify-between';
    displayNameSection.innerHTML = `
      <h4 class="flex-1">Display name</h4>
      <input type="text" value="${user?.display_name || ''}" class="flex-1 rounded-md text-black indent-4" minlength="3" maxlength="12"/>
      <div class="flex-1">
        <button class="bg-blue-400 w-[50px] rounded-md hover:scale-90 ml-3 border-2 border-white">&#x2713;</button>
      </div>
    `;
    leftColumn.appendChild(displayNameSection);

    // Password section (placeholder - will be component)
    const passwordSection = document.createElement('div');
    passwordSection.className = 'flex justify-center';
    passwordSection.innerHTML = `
      <h4 class="flex-1">Password</h4>
      <div class="flex-1">
        <button class="border-2 w-full bg-blue-800 hover:scale-105 text-white rounded-md translate-x-[-20px]">
          Change
        </button>
      </div>
      <div class="flex-1"></div>
    `;
    leftColumn.appendChild(passwordSection);

    mainContent.appendChild(leftColumn);

    // Right column: Avatar (React exact)
    const rightColumn = document.createElement('div');
    rightColumn.className = 'flex-[0.5] flex justify-center relative';
    
    // Avatar placeholder (will be component)
    rightColumn.innerHTML = `
      <img src="/api/placeholder/300/295" 
           alt="Avatar" 
           class="h-[295px] w-[300px] border-4 p-0 border-blue-800"/>
      
      <button class="absolute top-[275px] border-2 p-2 px-6 bg-blue-800 hover:scale-90 text-white text-[1.3rem] rounded-md">
        EDIT
      </button>
    `;

    mainContent.appendChild(rightColumn);
    centerContainer.appendChild(mainContent);
    container.appendChild(centerContainer);

    console.log('👤 ProfilePage: Created with React exact layout');
    return container;
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public destroy(): void {
    // Cleanup components
    if (this.header) {
      this.header.destroy();
    }
    if (this.backBtn) {
      this.backBtn.destroy();
    }
    
    console.log('👤 ProfilePage: Destroyed (React-like)');
    this.element.remove();
  }
}