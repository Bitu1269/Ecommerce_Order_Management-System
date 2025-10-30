// ============================================
// DATA STRUCTURES
// ============================================

// Binary Search Tree for price filtering
class BSTNode {
    constructor(product) {
        this.product = product;
        this.left = null;
        this.right = null;
    }
}

class BST {
    constructor() {
        this.root = null;
    }

    insert(product) {
        const newNode = new BSTNode(product);
        if (!this.root) {
            this.root = newNode;
            return;
        }

        let current = this.root;
        while (true) {
            if (product.price < current.product.price) {
                if (!current.left) {
                    current.left = newNode;
                    return;
                }
                current = current.left;
            } else {
                if (!current.right) {
                    current.right = newNode;
                    return;
                }
                current = current.right;
            }
        }
    }

    searchByPriceRange(minPrice, maxPrice) {
        const result = [];
        
        const search = (node) => {
            if (!node) return;
            
            if (node.product.price >= minPrice && node.product.price <= maxPrice) {
                result.push(node.product);
            }
            
            if (minPrice < node.product.price) {
                search(node.left);
            }
            if (maxPrice > node.product.price) {
                search(node.right);
            }
        };
        
        search(this.root);
        return result;
    }
}

// ============================================
// GLOBAL STATE
// ============================================

// HashMap for product storage (O(1) lookup)
const productsMap = new Map();

// Array for cart items
let cart = [];

// Queue for order processing (FIFO)
let orderQueue = [];

// Array for completed orders
let completedOrders = [];

// Stack for undo/redo functionality
let cartHistory = [];
let historyIndex = -1;

// ============================================
// INITIALIZATION
// ============================================

function init() {
    // Sample products data
    const sampleProducts = [
        { id: 1, name: 'Laptop', price: 899, stock: 15, category: 'Electronics' },
        { id: 2, name: 'Headphones', price: 199, stock: 3, category: 'Electronics' },
        { id: 3, name: 'Mouse', price: 49, stock: 50, category: 'Electronics' },
        { id: 4, name: 'Keyboard', price: 79, stock: 30, category: 'Electronics' },
        { id: 5, name: 'Monitor', price: 299, stock: 2, category: 'Electronics' },
        { id: 6, name: 'Webcam', price: 89, stock: 20, category: 'Electronics' },
        { id: 7, name: 'USB Cable', price: 15, stock: 100, category: 'Accessories' },
        { id: 8, name: 'Phone Case', price: 25, stock: 4, category: 'Accessories' },
        { id: 9, name: 'Tablet', price: 499, stock: 12, category: 'Electronics' },
        { id: 10, name: 'Smartwatch', price: 249, stock: 8, category: 'Electronics' }
    ];

    // Populate HashMap
    sampleProducts.forEach(product => {
        productsMap.set(product.id, product);
    });

    // Setup event listeners
    setupEventListeners();

    // Initial render
    renderProducts();
    updateStats();
    checkLowStock();
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Search input
    document.getElementById('searchInput').addEventListener('input', renderProducts);

    // Price range filters
    document.getElementById('minPrice').addEventListener('input', renderProducts);
    document.getElementById('maxPrice').addEventListener('input', renderProducts);

    // Undo/Redo
    document.getElementById('undoBtn').addEventListener('click', undoCart);
    document.getElementById('redoBtn').addEventListener('click', redoCart);

    // Place order
    document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);

    // Process order
    document.getElementById('processOrderBtn').addEventListener('click', processOrder);
}

// ============================================
// PRODUCT OPERATIONS
// ============================================

function renderProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const minPrice = Number(document.getElementById('minPrice').value);
    const maxPrice = Number(document.getElementById('maxPrice').value);

    let products;

    if (searchTerm) {
        // HashMap search O(1)
        products = [];
        productsMap.forEach(product => {
            if (product.name.toLowerCase().includes(searchTerm)) {
                products.push(product);
            }
        });
    } else {
        // BST price range search
        const bst = new BST();
        productsMap.forEach(product => bst.insert(product));
        products = bst.searchByPriceRange(minPrice, maxPrice);
    }

    const grid = document.getElementById('productsGrid');
    
    if (products.length === 0) {
        grid.innerHTML = '<p class="empty-message">No products found</p>';
        return;
    }

    grid.innerHTML = products.map(product => `
        <div class="product-card">
            <h3>${product.name}</h3>
            <p class="product-category">${product.category}</p>
            <div class="product-details">
                <span class="product-price">$${product.price}</span>
                <span class="product-stock ${product.stock < 5 ? 'low' : 'normal'}">
                    Stock: ${product.stock}
                </span>
            </div>
            <button 
                class="btn btn-primary btn-block" 
                onclick="addToCart(${product.id})"
                ${product.stock === 0 ? 'disabled' : ''}
            >
                ${product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
        </div>
    `).join('');
}

function checkLowStock() {
    const lowStockItems = [];
    productsMap.forEach(product => {
        if (product.stock < 5) {
            lowStockItems.push(product);
        }
    });

    const alert = document.getElementById('lowStockAlert');
    const list = document.getElementById('lowStockList');

    if (lowStockItems.length > 0) {
        alert.classList.remove('hidden');
        list.innerHTML = lowStockItems.map(p => 
            `<span>${p.name} (${p.stock} left)</span>`
        ).join('');
    } else {
        alert.classList.add('hidden');
    }
}

// ============================================
// CART OPERATIONS (with Stack for undo/redo)
// ============================================

function addToCart(productId) {
    const product = productsMap.get(productId);
    
    if (!product || product.stock === 0) {
        alert('Product out of stock!');
        return;
    }

    // Add to cart
    const cartItem = {
        ...product,
        cartId: Date.now()
    };
    cart.push(cartItem);

    // Update stock
    product.stock -= 1;

    // Save to history stack
    saveCartHistory();

    // Re-render
    renderCart();
    renderProducts();
    updateStats();
    checkLowStock();
}

function removeFromCart(cartId) {
    const itemIndex = cart.findIndex(item => item.cartId === cartId);
    if (itemIndex === -1) return;

    const item = cart[itemIndex];
    
    // Remove from cart
    cart.splice(itemIndex, 1);

    // Restore stock
    const product = productsMap.get(item.id);
    product.stock += 1;

    // Save to history stack
    saveCartHistory();

    // Re-render
    renderCart();
    renderProducts();
    updateStats();
    checkLowStock();
}

function saveCartHistory() {
    // Remove any history after current index
    cartHistory = cartHistory.slice(0, historyIndex + 1);
    
    // Add current cart state
    cartHistory.push(JSON.stringify(cart));
    historyIndex++;

    // Update undo/redo buttons
    updateUndoRedoButtons();
}

function undoCart() {
    if (historyIndex <= 0) return;

    historyIndex--;
    restoreCartFromHistory();
}

function redoCart() {
    if (historyIndex >= cartHistory.length - 1) return;

    historyIndex++;
    restoreCartFromHistory();
}

function restoreCartFromHistory() {
    const previousCart = JSON.parse(cartHistory[historyIndex]);
    
    // Restore stock for current cart items
    cart.forEach(item => {
        const product = productsMap.get(item.id);
        product.stock += 1;
    });

    // Apply previous cart
    cart = previousCart;

    // Update stock for restored items
    cart.forEach(item => {
        const product = productsMap.get(item.id);
        product.stock -= 1;
    });

    // Re-render
    renderCart();
    renderProducts();
    updateStats();
    checkLowStock();
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    document.getElementById('undoBtn').disabled = historyIndex <= 0;
    document.getElementById('redoBtn').disabled = historyIndex >= cartHistory.length - 1;
}

function renderCart() {
    const cartList = document.getElementById('cartList');
    const cartFooter = document.getElementById('cartFooter');

    if (cart.length === 0) {
        cartList.innerHTML = '<p class="empty-message">Cart is empty</p>';
        cartFooter.classList.add('hidden');
        return;
    }

    cartList.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-header">
                <span class="cart-item-name">${item.name}</span>
                <button class="btn btn-danger" onclick="removeFromCart(${item.cartId})">
                    Remove
                </button>
            </div>
            <div class="cart-item-price">$${item.price}</div>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    document.getElementById('cartTotal').textContent = `$${total.toFixed(2)}`;
    cartFooter.classList.remove('hidden');
}

// ============================================
// ORDER OPERATIONS (Queue - FIFO)
// ============================================

function placeOrder() {
    if (cart.length === 0) {
        alert('Cart is empty!');
        return;
    }

    const order = {
        id: Date.now(),
        items: [...cart],
        total: cart.reduce((sum, item) => sum + item.price, 0),
        timestamp: new Date().toLocaleString(),
        status: 'pending'
    };

    // Add to queue (enqueue)
    orderQueue.push(order);

    // Clear cart
    cart = [];
    cartHistory = [];
    historyIndex = -1;

    // Re-render
    renderCart();
    renderOrderQueue();
    updateStats();
    updateUndoRedoButtons();

    alert('Order placed successfully!');
}

function processOrder() {
    if (orderQueue.length === 0) return;

    // Dequeue (FIFO)
    const order = orderQueue.shift();
    order.status = 'completed';
    order.completedAt = new Date().toLocaleString();

    // Add to completed orders
    completedOrders.unshift(order);

    // Re-render
    renderOrderQueue();
    renderCompletedOrders();
    updateStats();
}

function renderOrderQueue() {
    const list = document.getElementById('orderQueueList');
    const processBtn = document.getElementById('processOrderBtn');

    if (orderQueue.length === 0) {
        list.innerHTML = '<p class="empty-message">No pending orders</p>';
        processBtn.disabled = true;
        return;
    }

    processBtn.disabled = false;
    list.innerHTML = orderQueue.map((order, index) => `
        <div class="order-card pending">
            <div class="order-header">
                <span class="order-id">Order #${order.id}</span>
                <span class="order-position">Position: ${index + 1}</span>
            </div>
            <p class="order-timestamp">${order.timestamp}</p>
            <p class="order-items">${order.items.length} items</p>
            <p class="order-total">$${order.total.toFixed(2)}</p>
        </div>
    `).join('');
}

function renderCompletedOrders() {
    const list = document.getElementById('completedOrdersList');

    if (completedOrders.length === 0) {
        list.innerHTML = '<p class="empty-message">No completed orders</p>';
        return;
    }

    list.innerHTML = completedOrders.map(order => `
        <div class="order-card completed">
            <div class="order-header">
                <span class="order-id">Order #${order.id}</span>
                <span style="font-size: 20px;">✓</span>
            </div>
            <p class="order-timestamp">Placed: ${order.timestamp}</p>
            <p class="order-timestamp">Completed: ${order.completedAt}</p>
            <p class="order-items">${order.items.length} items</p>
            <p class="order-total">$${order.total.toFixed(2)}</p>
        </div>
    `).join('');
}

// ============================================
// TAB SWITCHING
// ============================================

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// ============================================
// STATS UPDATE
// ============================================

function updateStats() {
    document.getElementById('totalProducts').textContent = productsMap.size;
    document.getElementById('cartItems').textContent = cart.length;
    document.getElementById('pendingOrders').textContent = orderQueue.length;
    document.getElementById('completedOrders').textContent = completedOrders.length;
}

// ============================================
// START APPLICATION
// ============================================

document.addEventListener('DOMContentLoaded', init);