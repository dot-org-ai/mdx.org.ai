/**
 * Section Components
 *
 * React wrappers for semantic HTML sections.
 * These components render <section aria-label="..."> with appropriate structure.
 */

import * as React from 'react'

export type SectionType =
  | 'Hero'
  | 'Features'
  | 'Pricing'
  | 'FAQ'
  | 'Testimonials'
  | 'Team'
  | 'Stats'
  | 'Logos'
  | 'Newsletter'
  | 'CTA'
  | 'Gallery'
  | 'Timeline'
  | 'Comparison'
  | 'Blog'
  | 'Contact'
  | 'Bento'
  | 'Integrations'

export interface SectionProps {
  /** Section type determines styling */
  type: SectionType
  /** Additional data attributes for styling variants */
  variant?: string
  children: React.ReactNode
}

/**
 * Generic section wrapper with aria-label
 */
export function Section({ type, variant, children }: SectionProps) {
  return (
    <section aria-label={type} data-style={variant}>
      {children}
    </section>
  )
}

/* ==========================================================================
   Hero Section
   ========================================================================== */

export interface HeroProps {
  /** Small tagline above headline */
  tagline?: string
  /** Badge or announcement above headline */
  badge?: React.ReactNode | string
  /** Announcement text or component */
  announcement?: React.ReactNode | string
  /** Main headline */
  headline: string
  /** Description text */
  description?: string
  /** Background image URL */
  backgroundImage?: string
  /** Background video URL */
  video?: string
  /** Background element or gradient */
  background?: React.ReactNode
  /** Trusted by logos section */
  trustedBy?: { logos: Array<{ src: string; alt: string }> }
  /** Hero variant */
  variant?: 'default' | 'centered' | 'split' | 'minimal'
  children?: React.ReactNode
}

export function Hero({
  tagline,
  badge,
  announcement,
  headline,
  description,
  backgroundImage,
  video,
  background,
  trustedBy,
  variant = 'default',
  children,
}: HeroProps) {
  return (
    <section
      aria-label="Hero"
      data-variant={variant}
      data-background={backgroundImage ? 'true' : undefined}
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
    >
      {background && <div data-background-element>{background}</div>}
      {video && (
        <video autoPlay loop muted playsInline data-background-video>
          <source src={video} type="video/mp4" />
        </video>
      )}
      {(badge || announcement) && (
        <div data-announcement>
          {typeof badge === 'string' ? <span data-badge>{badge}</span> : badge}
          {typeof announcement === 'string' ? <span>{announcement}</span> : announcement}
        </div>
      )}
      {tagline && <small>{tagline}</small>}
      <h1>{headline}</h1>
      {description && <p>{description}</p>}
      {children}
      {trustedBy && (
        <div data-trusted-by>
          <small>Trusted by</small>
          <div>
            {trustedBy.logos.map((logo, i) => (
              <img key={i} src={logo.src} alt={logo.alt} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

/* ==========================================================================
   Features Section
   ========================================================================== */

export interface Feature {
  icon?: React.ReactNode
  title: string
  description: string
  image?: string
  href?: string
}

export interface FeaturesProps {
  /** Section headline */
  headline?: string
  /** Section description */
  description?: string
  /** Feature items */
  features: Feature[]
  /** Display style: default or cards */
  style?: 'default' | 'cards'
  /** Feature variant */
  variant?: 'grid' | 'list' | 'bento' | 'alternate'
  /** Number of columns (for grid layout) */
  columns?: 2 | 3 | 4
}

export function Features({
  headline,
  description,
  features,
  style,
  variant = 'grid',
  columns = 3,
}: FeaturesProps) {
  return (
    <section aria-label="Features" data-style={style} data-variant={variant} data-columns={columns}>
      {(headline || description) && (
        <header>
          {headline && <h2>{headline}</h2>}
          {description && <p>{description}</p>}
        </header>
      )}
      <div>
        {features.map((feature, i) => {
          const content = (
            <>
              {feature.image && <img src={feature.image} alt={feature.title} />}
              {feature.icon && <div data-icon>{feature.icon}</div>}
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </>
          )

          return feature.href ? (
            <a key={i} href={feature.href} data-feature-card>
              {content}
            </a>
          ) : (
            <article key={i}>{content}</article>
          )
        })}
      </div>
    </section>
  )
}

/* ==========================================================================
   Pricing Section
   ========================================================================== */

export interface PricingTier {
  name: string
  description?: string
  badge?: string
  price: string
  period?: string
  features: string[]
  includedFeatures?: string[]
  excludedFeatures?: string[]
  cta: string
  ctaHref?: string
  featured?: boolean
}

export interface PricingProps {
  headline?: string
  description?: string
  tiers: PricingTier[]
  billingToggle?: {
    monthly: string
    annual: string
    onToggle?: (period: 'monthly' | 'annual') => void
  }
  badge?: React.ReactNode | string
}

export function Pricing({ headline, description, tiers, billingToggle, badge }: PricingProps) {
  const [billingPeriod, setBillingPeriod] = React.useState<'monthly' | 'annual'>('monthly')

  return (
    <section aria-label="Pricing">
      {(headline || description || badge || billingToggle) && (
        <header>
          {badge && (typeof badge === 'string' ? <span data-badge>{badge}</span> : badge)}
          {headline && <h2>{headline}</h2>}
          {description && <p>{description}</p>}
          {billingToggle && (
            <div data-billing-toggle>
              <button
                data-active={billingPeriod === 'monthly' || undefined}
                onClick={() => {
                  setBillingPeriod('monthly')
                  billingToggle.onToggle?.('monthly')
                }}
              >
                {billingToggle.monthly}
              </button>
              <button
                data-active={billingPeriod === 'annual' || undefined}
                onClick={() => {
                  setBillingPeriod('annual')
                  billingToggle.onToggle?.('annual')
                }}
              >
                {billingToggle.annual}
              </button>
            </div>
          )}
        </header>
      )}
      <div>
        {tiers.map((tier, i) => (
          <article key={i} data-featured={tier.featured || undefined}>
            <header>
              {tier.badge && <span data-tier-badge>{tier.badge}</span>}
              <h3>{tier.name}</h3>
              {tier.description && <p>{tier.description}</p>}
            </header>
            <span data-price>
              {tier.price}
              {tier.period && <small>{tier.period}</small>}
            </span>
            {tier.features.length > 0 && (
              <ul>
                {tier.features.map((feature, j) => (
                  <li key={j}>{feature}</li>
                ))}
              </ul>
            )}
            {tier.includedFeatures && tier.includedFeatures.length > 0 && (
              <ul data-included>
                {tier.includedFeatures.map((feature, j) => (
                  <li key={j} data-included>
                    {feature}
                  </li>
                ))}
              </ul>
            )}
            {tier.excludedFeatures && tier.excludedFeatures.length > 0 && (
              <ul data-excluded>
                {tier.excludedFeatures.map((feature, j) => (
                  <li key={j} data-excluded>
                    {feature}
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => tier.ctaHref && (window.location.href = tier.ctaHref)}>
              {tier.cta}
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

/* ==========================================================================
   FAQ Section
   ========================================================================== */

export interface FAQItem {
  question: string
  answer: string
}

export interface FAQProps {
  headline?: string
  items: FAQItem[]
}

export function FAQ({ headline, items }: FAQProps) {
  return (
    <section aria-label="FAQ">
      {headline && (
        <header>
          <h2>{headline}</h2>
        </header>
      )}
      <div>
        {items.map((item, i) => (
          <details key={i}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

/* ==========================================================================
   Testimonials Section
   ========================================================================== */

export interface Testimonial {
  quote: string
  author: string
  role?: string
  avatar?: string
  rating?: number
  logo?: string
  featured?: boolean
}

export interface TestimonialsProps {
  headline?: string
  description?: string
  testimonials: Testimonial[]
  variant?: 'grid' | 'wall' | 'masonry' | 'marquee'
}

export function Testimonials({
  headline,
  description,
  testimonials,
  variant = 'grid',
}: TestimonialsProps) {
  return (
    <section aria-label="Testimonials" data-variant={variant}>
      {(headline || description) && (
        <header>
          {headline && <h2>{headline}</h2>}
          {description && <p>{description}</p>}
        </header>
      )}
      <div>
        {testimonials.map((testimonial, i) => (
          <blockquote key={i} data-featured={testimonial.featured || undefined}>
            {testimonial.rating && (
              <div data-rating>
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} data-filled={j < testimonial.rating! || undefined}>
                    ★
                  </span>
                ))}
              </div>
            )}
            <p>{testimonial.quote}</p>
            <footer>
              {testimonial.avatar && <img src={testimonial.avatar} alt={testimonial.author} />}
              <div>
                <strong>{testimonial.author}</strong>
                {testimonial.role && <span>{testimonial.role}</span>}
              </div>
              {testimonial.logo && <img src={testimonial.logo} alt="" data-company-logo />}
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  )
}

/* ==========================================================================
   Stats Section
   ========================================================================== */

export interface Stat {
  label: string
  value: string | number
  trend?: {
    direction: 'up' | 'down'
    value: string
  }
  icon?: React.ReactNode
  sparkline?: number[]
}

export interface StatsProps {
  headline?: string
  description?: string
  stats: Stat[]
}

export function Stats({ headline, description, stats }: StatsProps) {
  return (
    <section aria-label="Stats">
      {(headline || description) && (
        <header>
          {headline && <h2>{headline}</h2>}
          {description && <p>{description}</p>}
        </header>
      )}
      <div>
        {stats.map((stat, i) => (
          <dl key={i}>
            {stat.icon && <div data-icon>{stat.icon}</div>}
            <dd>{stat.value}</dd>
            {stat.trend && (
              <span data-trend data-direction={stat.trend.direction}>
                {stat.trend.value}
              </span>
            )}
            <dt>{stat.label}</dt>
            {stat.sparkline && (
              <div data-sparkline>
                {stat.sparkline.map((point, j) => (
                  <span key={j} style={{ height: `${point}%` }} />
                ))}
              </div>
            )}
          </dl>
        ))}
      </div>
    </section>
  )
}

/* ==========================================================================
   Logos Section
   ========================================================================== */

export interface Logo {
  src: string
  alt: string
  href?: string
}

export interface LogosProps {
  title?: string
  logos: Logo[]
}

export function Logos({ title, logos }: LogosProps) {
  return (
    <section aria-label="Logos">
      {title && <p>{title}</p>}
      <div>
        {logos.map((logo, i) =>
          logo.href ? (
            <a key={i} href={logo.href}>
              <img src={logo.src} alt={logo.alt} />
            </a>
          ) : (
            <img key={i} src={logo.src} alt={logo.alt} />
          )
        )}
      </div>
    </section>
  )
}

/* ==========================================================================
   Newsletter Section
   ========================================================================== */

export interface NewsletterProps {
  headline?: string
  description?: string
  placeholder?: string
  buttonText?: string
  onSubmit?: (email: string) => void
}

export function Newsletter({
  headline,
  description,
  placeholder = 'Enter your email',
  buttonText = 'Subscribe',
  onSubmit,
}: NewsletterProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    onSubmit?.(email)
  }

  return (
    <section aria-label="Newsletter">
      {headline && <h2>{headline}</h2>}
      {description && <p>{description}</p>}
      <form onSubmit={handleSubmit}>
        <input type="email" name="email" placeholder={placeholder} required />
        <button type="submit">{buttonText}</button>
      </form>
    </section>
  )
}

/* ==========================================================================
   CTA Section
   ========================================================================== */

export interface CTAProps {
  headline: string
  description?: string
  buttonText: string
  buttonHref?: string
  onClick?: () => void
}

export function CTA({ headline, description, buttonText, buttonHref, onClick }: CTAProps) {
  return (
    <section aria-label="CTA">
      <h2>{headline}</h2>
      {description && <p>{description}</p>}
      <button onClick={onClick || (() => buttonHref && (window.location.href = buttonHref))}>
        {buttonText}
      </button>
    </section>
  )
}

/* ==========================================================================
   Timeline Section
   ========================================================================== */

export interface TimelineEvent {
  date: string
  title: string
  description?: string
}

export interface TimelineProps {
  headline?: string
  events: TimelineEvent[]
}

export function Timeline({ headline, events }: TimelineProps) {
  return (
    <section aria-label="Timeline">
      {headline && (
        <header>
          <h2>{headline}</h2>
        </header>
      )}
      <ol>
        {events.map((event, i) => (
          <li key={i}>
            <time>{event.date}</time>
            <h3>{event.title}</h3>
            {event.description && <p>{event.description}</p>}
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ==========================================================================
   Team Section
   ========================================================================== */

export interface TeamMember {
  name: string
  role: string
  bio?: string
  avatar?: string
  social?: {
    twitter?: string
    linkedin?: string
    github?: string
    email?: string
  }
}

export interface TeamProps {
  headline?: string
  description?: string
  members: TeamMember[]
  variant?: 'grid' | 'list'
  columns?: 2 | 3 | 4
}

export function Team({ headline, description, members, variant = 'grid', columns = 3 }: TeamProps) {
  return (
    <section aria-label="Team" data-variant={variant} data-columns={columns}>
      {(headline || description) && (
        <header>
          {headline && <h2>{headline}</h2>}
          {description && <p>{description}</p>}
        </header>
      )}
      <div>
        {members.map((member, i) => (
          <article key={i}>
            {member.avatar && <img src={member.avatar} alt={member.name} />}
            <h3>{member.name}</h3>
            <p data-role>{member.role}</p>
            {member.bio && <p>{member.bio}</p>}
            {member.social && (
              <div data-social>
                {member.social.twitter && (
                  <a href={member.social.twitter} aria-label="Twitter">
                    Twitter
                  </a>
                )}
                {member.social.linkedin && (
                  <a href={member.social.linkedin} aria-label="LinkedIn">
                    LinkedIn
                  </a>
                )}
                {member.social.github && (
                  <a href={member.social.github} aria-label="GitHub">
                    GitHub
                  </a>
                )}
                {member.social.email && (
                  <a href={`mailto:${member.social.email}`} aria-label="Email">
                    Email
                  </a>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

/* ==========================================================================
   Blog Section
   ========================================================================== */

export interface BlogPost {
  title: string
  excerpt: string
  author?: string
  date?: string
  image?: string
  category?: string
  tags?: string[]
  href: string
  readTime?: string
}

export interface BlogProps {
  headline?: string
  description?: string
  posts: BlogPost[]
  variant?: 'grid' | 'list' | 'featured'
  columns?: 2 | 3
}

export function BlogSection({ headline, description, posts, variant = 'grid', columns = 3 }: BlogProps) {
  return (
    <section aria-label="Blog" data-variant={variant} data-columns={columns}>
      {(headline || description) && (
        <header>
          {headline && <h2>{headline}</h2>}
          {description && <p>{description}</p>}
        </header>
      )}
      <div>
        {posts.map((post, i) => (
          <article key={i}>
            {post.image && <img src={post.image} alt={post.title} />}
            {post.category && <span data-category>{post.category}</span>}
            <h3>
              <a href={post.href}>{post.title}</a>
            </h3>
            <p>{post.excerpt}</p>
            <footer>
              {post.author && <span data-author>{post.author}</span>}
              {post.date && <time>{post.date}</time>}
              {post.readTime && <span data-read-time>{post.readTime}</span>}
              {post.tags && post.tags.length > 0 && (
                <div data-tags>
                  {post.tags.map((tag, j) => (
                    <span key={j}>{tag}</span>
                  ))}
                </div>
              )}
            </footer>
          </article>
        ))}
      </div>
    </section>
  )
}

/* ==========================================================================
   Contact Section
   ========================================================================== */

export interface ContactInfo {
  email?: string
  phone?: string
  address?: string
  hours?: string
}

export interface ContactProps {
  headline?: string
  description?: string
  info?: ContactInfo
  social?: Array<{ platform: string; href: string; label?: string }>
  form?: {
    fields?: Array<{
      name: string
      type: 'text' | 'email' | 'tel' | 'textarea'
      label: string
      required?: boolean
      placeholder?: string
    }>
    submitText?: string
    onSubmit?: (data: Record<string, string>) => void
  }
}

export function ContactSection({ headline, description, info, social, form }: ContactProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (form?.onSubmit) {
      const formData = new FormData(e.currentTarget)
      const data: Record<string, string> = {}
      formData.forEach((value, key) => {
        data[key] = value as string
      })
      form.onSubmit(data)
    }
  }

  return (
    <section aria-label="Contact">
      {(headline || description) && (
        <header>
          {headline && <h2>{headline}</h2>}
          {description && <p>{description}</p>}
        </header>
      )}
      <div data-contact-wrapper>
        {info && (
          <div data-contact-info>
            {info.email && (
              <div>
                <strong>Email</strong>
                <a href={`mailto:${info.email}`}>{info.email}</a>
              </div>
            )}
            {info.phone && (
              <div>
                <strong>Phone</strong>
                <a href={`tel:${info.phone}`}>{info.phone}</a>
              </div>
            )}
            {info.address && (
              <div>
                <strong>Address</strong>
                <p>{info.address}</p>
              </div>
            )}
            {info.hours && (
              <div>
                <strong>Hours</strong>
                <p>{info.hours}</p>
              </div>
            )}
          </div>
        )}
        {social && social.length > 0 && (
          <div data-social>
            {social.map((link, i) => (
              <a key={i} href={link.href}>
                {link.label || link.platform}
              </a>
            ))}
          </div>
        )}
        {form && (
          <form onSubmit={handleSubmit}>
            {form.fields?.map((field, i) =>
              field.type === 'textarea' ? (
                <div key={i}>
                  <label htmlFor={field.name}>{field.label}</label>
                  <textarea
                    id={field.name}
                    name={field.name}
                    required={field.required}
                    placeholder={field.placeholder}
                  />
                </div>
              ) : (
                <div key={i}>
                  <label htmlFor={field.name}>{field.label}</label>
                  <input
                    id={field.name}
                    type={field.type}
                    name={field.name}
                    required={field.required}
                    placeholder={field.placeholder}
                  />
                </div>
              )
            )}
            <button type="submit">{form.submitText || 'Send Message'}</button>
          </form>
        )}
      </div>
    </section>
  )
}

/* ==========================================================================
   Gallery Section
   ========================================================================== */

export interface GalleryImage {
  src: string
  alt: string
  title?: string
  caption?: string
  href?: string
}

export interface GalleryProps {
  headline?: string
  description?: string
  images: GalleryImage[]
  variant?: 'grid' | 'masonry' | 'carousel'
  columns?: 2 | 3 | 4
}

export function GallerySection({
  headline,
  description,
  images,
  variant = 'grid',
  columns = 3,
}: GalleryProps) {
  return (
    <section aria-label="Gallery" data-variant={variant} data-columns={columns}>
      {(headline || description) && (
        <header>
          {headline && <h2>{headline}</h2>}
          {description && <p>{description}</p>}
        </header>
      )}
      <div>
        {images.map((image, i) => {
          const content = (
            <>
              <img src={image.src} alt={image.alt} />
              {(image.title || image.caption) && (
                <figcaption>
                  {image.title && <strong>{image.title}</strong>}
                  {image.caption && <p>{image.caption}</p>}
                </figcaption>
              )}
            </>
          )

          return image.href ? (
            <a key={i} href={image.href}>
              <figure>{content}</figure>
            </a>
          ) : (
            <figure key={i}>{content}</figure>
          )
        })}
      </div>
    </section>
  )
}

/* ==========================================================================
   Bento Section
   ========================================================================== */

export interface BentoItem {
  title: string
  description?: string
  icon?: React.ReactNode
  image?: string
  href?: string
  size?: 'small' | 'medium' | 'large'
  color?: string
}

export interface BentoProps {
  headline?: string
  description?: string
  items: BentoItem[]
}

export function BentoSection({ headline, description, items }: BentoProps) {
  return (
    <section aria-label="Bento">
      {(headline || description) && (
        <header>
          {headline && <h2>{headline}</h2>}
          {description && <p>{description}</p>}
        </header>
      )}
      <div data-bento-grid>
        {items.map((item, i) => {
          const content = (
            <>
              {item.icon && <div data-icon>{item.icon}</div>}
              {item.image && <img src={item.image} alt={item.title} />}
              <h3>{item.title}</h3>
              {item.description && <p>{item.description}</p>}
            </>
          )

          return item.href ? (
            <a
              key={i}
              href={item.href}
              data-size={item.size || 'medium'}
              style={item.color ? { backgroundColor: item.color } : undefined}
            >
              {content}
            </a>
          ) : (
            <div
              key={i}
              data-size={item.size || 'medium'}
              style={item.color ? { backgroundColor: item.color } : undefined}
            >
              {content}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ==========================================================================
   Comparison Section
   ========================================================================== */

export interface ComparisonFeature {
  feature: string
  ours: boolean | string
  theirs: boolean | string
}

export interface ComparisonProps {
  headline?: string
  description?: string
  ourProduct: string
  theirProduct: string
  features: ComparisonFeature[]
}

export function ComparisonSection({
  headline,
  description,
  ourProduct,
  theirProduct,
  features,
}: ComparisonProps) {
  return (
    <section aria-label="Comparison">
      {(headline || description) && (
        <header>
          {headline && <h2>{headline}</h2>}
          {description && <p>{description}</p>}
        </header>
      )}
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>{ourProduct}</th>
            <th>{theirProduct}</th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature, i) => (
            <tr key={i}>
              <td>{feature.feature}</td>
              <td>
                {typeof feature.ours === 'boolean' ? (
                  <span data-check={feature.ours}>{feature.ours ? '✓' : '✗'}</span>
                ) : (
                  feature.ours
                )}
              </td>
              <td>
                {typeof feature.theirs === 'boolean' ? (
                  <span data-check={feature.theirs}>{feature.theirs ? '✓' : '✗'}</span>
                ) : (
                  feature.theirs
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

/* ==========================================================================
   Integrations Section
   ========================================================================== */

export interface Integration {
  name: string
  logo: string
  category?: string
  href?: string
}

export interface IntegrationsProps {
  headline?: string
  description?: string
  integrations: Integration[]
  categories?: string[]
  variant?: 'grid' | 'logos' | 'cards'
  columns?: 3 | 4 | 5 | 6
}

export function IntegrationsSection({
  headline,
  description,
  integrations,
  categories,
  variant = 'grid',
  columns = 6,
}: IntegrationsProps) {
  const groupedIntegrations = categories
    ? categories.reduce(
        (acc, category) => {
          acc[category] = integrations.filter((i) => i.category === category)
          return acc
        },
        {} as Record<string, Integration[]>
      )
    : { All: integrations }

  return (
    <section aria-label="Integrations" data-variant={variant} data-columns={columns}>
      {(headline || description) && (
        <header>
          {headline && <h2>{headline}</h2>}
          {description && <p>{description}</p>}
        </header>
      )}
      {Object.entries(groupedIntegrations).map(([category, items]) => (
        <div key={category} data-category-group>
          {categories && <h3>{category}</h3>}
          <div>
            {items.map((integration, i) =>
              integration.href ? (
                <a key={i} href={integration.href} title={integration.name}>
                  <img src={integration.logo} alt={integration.name} />
                  {variant === 'cards' && <span>{integration.name}</span>}
                </a>
              ) : (
                <div key={i} title={integration.name}>
                  <img src={integration.logo} alt={integration.name} />
                  {variant === 'cards' && <span>{integration.name}</span>}
                </div>
              )
            )}
          </div>
        </div>
      ))}
    </section>
  )
}
