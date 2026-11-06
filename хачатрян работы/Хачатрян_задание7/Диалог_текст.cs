using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Хачатрян_задание7
{
    public partial class Диалог_текст : Form
    {
        public String Word = "";
        public String NewWord = "";

        public Диалог_текст()
        {
            InitializeComponent();
        }

        private void Диалог_текст_Load(object sender, EventArgs e)
        {
            textBox1.Text = Word;
        }

        private void button1_Click(object sender, EventArgs e)
        {
            NewWord = textBox2.Text;
            DialogResult = DialogResult.OK;
        }

        private void button2_Click(object sender, EventArgs e)
        {
            DialogResult = DialogResult.Cancel;
        }
    }
}
