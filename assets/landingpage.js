// HERO LOAD ANIMATION
window.addEventListener("load", () => {
  document.querySelector(".hero-content").classList.add("show");
});


// SMOOTH SCROLL + TRIGGER ANIMATION
document.getElementById("learnMoreBtn").addEventListener("click", () => {
  document.getElementById("features").scrollIntoView({
    behavior: "smooth"
  });
});


// SCROLL TRANSFORM ANIMATION
const cards = document.querySelectorAll(".card");

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("show");
    }
  });
}, {
  threshold: 0.2
});

cards.forEach(card => observer.observe(card));