import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChartBar, Download, Filter, Calendar, Check, Users } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="border-b border-border bg-background px-6 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-teal-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">Z</span>
            </div>
            <div className="font-bold text-xl">ZoomLytics</div>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/login')}>Log in</Button>
            <Button onClick={() => navigate('/register')}>Sign up free</Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center px-6 py-12 md:py-24 bg-gradient-to-br from-brand-50 to-teal-50">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight animate-fade-in">
            Transform your Zoom Webinar Analytics
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: "200ms" }}>
            The complete data sanitization, analysis and reporting platform for your Zoom webinars. 
            Clean, visualize, and gain valuable insights with one powerful tool.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in" style={{ animationDelay: "400ms" }}>
            <Button size="lg" onClick={() => navigate('/register')}>
              Get Started Free
            </Button>
            <Button size="lg" variant="outline">
              Schedule a Demo
            </Button>
          </div>
          <div className="pt-8 animate-fade-in" style={{ animationDelay: "600ms" }}>
            <div className="bg-white/40 backdrop-blur-sm border border-border rounded-2xl shadow-2xl overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1470&auto=format" 
                alt="ZoomLytics Dashboard Preview" 
                className="rounded-lg shadow-sm w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-16 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage, analyze, and get the most out of your Zoom webinar data
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <div className="h-12 w-12 rounded-lg bg-primary/10 mb-4 flex items-center justify-center">
                <Filter className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Data Sanitization</h3>
              <p className="text-muted-foreground">
                Automatically clean, merge, and normalize your webinar data to eliminate duplicates and inconsistencies.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <div className="h-12 w-12 rounded-lg bg-primary/10 mb-4 flex items-center justify-center">
                <ChartBar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-muted-foreground">
                Visualize key metrics and trends with beautiful charts and AI-powered insights.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <div className="h-12 w-12 rounded-lg bg-primary/10 mb-4 flex items-center justify-center">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Export Manager</h3>
              <p className="text-muted-foreground">
                Export sanitized data to CSV, Excel, PDF or share interactive report links with your team.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <div className="h-12 w-12 rounded-lg bg-primary/10 mb-4 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Webinar Dashboard</h3>
              <p className="text-muted-foreground">
                Get a comprehensive overview of each webinar with key metrics and engagement scores.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <div className="h-12 w-12 rounded-lg bg-primary/10 mb-4 flex items-center justify-center">
                <Filter className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Dynamic Filtering</h3>
              <p className="text-muted-foreground">
                Create custom filters based on registration questions, attendance duration, and more.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <div className="h-12 w-12 rounded-lg bg-primary/10 mb-4 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-Tenant Access</h3>
              <p className="text-muted-foreground">
                Securely manage team access with role-based permissions and data isolation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes with our simple integration process
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 mb-4 flex items-center justify-center mx-auto">
                <span className="text-xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Connect with Zoom</h3>
              <p className="text-muted-foreground">
                Securely link your Zoom account with a simple OAuth integration.
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 mb-4 flex items-center justify-center mx-auto">
                <span className="text-xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Import Your Data</h3>
              <p className="text-muted-foreground">
                We automatically fetch and clean your webinar data.
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 mb-4 flex items-center justify-center mx-auto">
                <span className="text-xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Analyze and Export</h3>
              <p className="text-muted-foreground">
                Get instant insights and share reports with your team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-16 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">Starter</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">$49</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground mb-6">Perfect for individuals and small teams.</p>
                <Button className="w-full" variant="outline">Get Started</Button>
              </div>
              <div className="border-t border-border p-6">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Up to 20 webinars/month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Basic data sanitization</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>CSV & Excel exports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>7-day data retention</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-card border-2 border-primary rounded-lg overflow-hidden shadow-md relative">
              <div className="absolute top-0 right-0">
                <div className="bg-primary text-primary-foreground py-1 px-3 text-xs font-semibold rounded-bl-lg">
                  MOST POPULAR
                </div>
              </div>
              <div className="p-6 pt-10">
                <h3 className="text-xl font-semibold mb-2">Professional</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">$99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground mb-6">Perfect for growing businesses.</p>
                <Button className="w-full">Get Started</Button>
              </div>
              <div className="border-t border-border p-6">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Unlimited webinars</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Advanced data sanitization</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>All export formats</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>30-day data retention</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Team collaboration (up to 5)</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">Enterprise</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">Custom</span>
                </div>
                <p className="text-muted-foreground mb-6">For large organizations with complex needs.</p>
                <Button className="w-full" variant="outline">Contact Sales</Button>
              </div>
              <div className="border-t border-border p-6">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Everything in Professional</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Custom data retention</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Dedicated account manager</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Custom integrations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Unlimited team members</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 bg-gradient-to-br from-brand-600 to-teal-500 text-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to transform your webinar analytics?</h2>
          <p className="text-xl text-white/80 max-w-xl mx-auto">
            Join thousands of businesses who are getting more from their webinar data with ZoomLytics.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" onClick={() => navigate('/register')}>
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
              Schedule a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-card border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold mb-3">Product</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Features</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Roadmap</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Company</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">About</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Blog</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Careers</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Documentation</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Help Center</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Privacy</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Terms</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-teal-500 flex items-center justify-center">
                <span className="text-white font-bold">Z</span>
              </div>
              <span className="font-semibold">ZoomLytics</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ZoomLytics Inc. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
