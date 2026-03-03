const router = {
  currentPage: 'home',
  previousPage: null,

  async init() {
    window.addEventListener('popstate', (e) => {
      const page = e.state?.page || 'home';
      this.showPage(page, false);
    });

    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-link]');
      if (link) {
        e.preventDefault();
        const page = link.getAttribute('data-link');
        this.navigateTo(page);
      }
    });

    this.showPage('home', false);
  },

  navigateTo(page) {
    if (page !== this.currentPage) {
      this.showPage(page, true);
    }
  },

  showPage(page, updateHistory = true) {
    this.previousPage = this.currentPage;
    this.currentPage = page;

    document.getElementById('page-home').style.display = 'none';
    document.getElementById('page-datasets').style.display = 'none';
    document.getElementById('page-about').style.display = 'none';

    document.getElementById(`page-${page}`).style.display = 'block';

    const btnBack = document.getElementById('btn-back');
    const btnDatasets = document.getElementById('btn-datasets');
    const btnAbout = document.getElementById('btn-about');

    if (page === 'home') {
      btnBack.style.display = 'none';
      btnDatasets.style.display = 'inline-block';
      btnAbout.style.display = 'inline-block';
      btnBack.setAttribute('data-link', this.previousPage || 'home');
    } else {
      btnBack.style.display = 'inline-block';
      btnDatasets.style.display = 'none';
      btnAbout.style.display = 'none';
      btnBack.setAttribute('data-link', 'home');
    }

    window.scrollTo(0, 0);

    if (updateHistory) {
      const url = page === 'home' ? '/' : `/${page}`;
      window.history.pushState({ page }, '', url);
    }

    const titles = {
      home: 'Veni Vidi Viz',
      datasets: 'Dataset - Veni Vidi Viz',
      about: 'Chi Siamo - Veni Vidi Viz'
    };
    document.title = titles[page] || 'Veni Vidi Viz';
  }
};
