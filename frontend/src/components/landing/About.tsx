import { motion } from 'framer-motion'

const About = () => {
  return (
    <section className="py-24 relative z-10 transition-colors duration-500">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="p-10 paper-card rounded-md relative overflow-hidden group transition-colors duration-500"
        >
          <div className="absolute inset-0 bg-[#efe7d2]/60 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <h2 className="paper-font-type text-3xl md:text-4xl font-bold mb-6 text-[var(--text-heading)] relative z-10 transition-colors duration-500">
            About CampusResolve
          </h2>
          
          <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-light relative z-10 transition-colors duration-500">
            CampusResolve is a smart campus management platform developed using the MERN Stack to digitize and modernize complaint handling and feedback systems in educational institutions.
          </p>
          
          <div className="mt-8 flex justify-center gap-4 flex-wrap relative z-10">
            {['MongoDB', 'Express.js', 'React.js', 'Node.js', 'TailwindCSS'].map((tech) => (
              <span key={tech} className="paper-font-type px-4 py-2 rounded-full bg-[#efe7d2]/60 dark:bg-white/5 border-[1.5px] border-dashed border-[#e5dcc3] dark:border-white/10 text-sm font-bold text-indigo-600 dark:text-indigo-300 transition-colors duration-500 -rotate-1">
                {tech}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default About
