export class OnlinePlayerSelector {
    private container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
        this.render();
    }

    private render() {
        this.container.innerHTML = '';
        this.container.style.backgroundColor = '#222';
        this.container.style.color = '#fff';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.alignItems = 'center';
        this.container.style.justifyContent = 'center';
        this.container.style.minHeight = '100vh';
        this.container.style.gap = '20px';

        const title = document.createElement('h1');
        title.textContent = 'Select Opponent';
        title.style.marginBottom = '30px';

        // Quick game button
        const quickGameButton = document.createElement('button');
        quickGameButton.textContent = 'Quick Game (Random Opponent)';
        quickGameButton.style.padding = '15px 30px';
        quickGameButton.style.fontSize = '18px';
        quickGameButton.style.backgroundColor = '#28a745';
        quickGameButton.style.color = 'white';
        quickGameButton.style.border = 'none';
        quickGameButton.style.borderRadius = '5px';
        quickGameButton.style.cursor = 'pointer';

        quickGameButton.addEventListener('click', () => {
            // Use random opponent ID (backend will handle matching)
            window.router?.navigate('/game/2');
        });

        // Back button
        const backButton = document.createElement('button');
        backButton.textContent = 'Back';
        backButton.style.padding = '10px 20px';
        backButton.style.fontSize = '16px';
        backButton.style.backgroundColor = '#6c757d';
        backButton.style.color = 'white';
        backButton.style.border = 'none';
        backButton.style.borderRadius = '5px';
        backButton.style.cursor = 'pointer';

        backButton.addEventListener('click', () => {
            window.router?.navigate('/game');
        });

        this.container.appendChild(title);
        this.container.appendChild(quickGameButton);
        this.container.appendChild(backButton);
    }
}